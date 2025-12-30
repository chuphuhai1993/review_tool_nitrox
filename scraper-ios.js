import store from 'app-store-scraper';
import fs from 'fs';
import readline from 'readline';

// Tạo interface để đọc input từ console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hàm hỏi câu hỏi và trả về promise
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Parse danh sách app IDs từ input
// Xử lý dấu phẩy, khoảng trắng thừa, và app id rỗng
function parseAppIds(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }

  // Tách bằng dấu phẩy, trim khoảng trắng, và lọc bỏ chuỗi rỗng
  const appIds = input
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  // Loại bỏ duplicate
  return [...new Set(appIds)];
}

// Hàm trích xuất quốc gia từ review data
function extractCountry(review) {
  // Trường country đã được gán khi crawl
  return review.country || 'Unknown';
}

// Hàm crawl reviews cho một app từ một country cụ thể
async function scrapeReviewsFromCountry(appId, country, limit = 100) {
  try {
    const reviews = [];
    let page = 1;
    
    // Crawl reviews từng batch (mỗi page ~50 reviews)
    while (reviews.length < limit) {
      const result = await store.reviews({
        id: appId,
        sort: store.sort.RECENT,
        page: page,
        country: country.toLowerCase(), // iOS yêu cầu lowercase
      });

      if (!result || result.length === 0) {
        break;
      }

      // Gán country cho mỗi review
      const reviewsWithCountry = result.map(review => ({
        ...review,
        country: country
      }));

      reviews.push(...reviewsWithCountry);
      page++;

      // Kiểm tra xem còn reviews không
      if (result.length < 50) {
        break;
      }

      // Giới hạn số lượng
      if (reviews.length >= limit) {
        break;
      }
    }

    return reviews.slice(0, limit);
    
  } catch (error) {
    console.error(`   ⚠️  Lỗi khi crawl từ ${country}: ${error.message}`);
    return [];
  }
}

// Hàm crawl reviews từ nhiều quốc gia
async function scrapeReviews(appId, countries, limitPerCountry = 50) {
  console.log(`\n🔍 Đang crawl reviews cho ${appId} từ ${countries.length} quốc gia...`);
  
  const allReviews = [];
  
  for (const country of countries) {
    process.stdout.write(`   📍 ${country}... `);
    const reviews = await scrapeReviewsFromCountry(appId, country, limitPerCountry);
    if (reviews.length > 0) {
      allReviews.push(...reviews);
      console.log(`✅ ${reviews.length} reviews`);
    } else {
      console.log(`⚠️  0 reviews`);
    }
  }

  console.log(`✅ Tổng: ${allReviews.length} reviews cho ${appId}`);
  return allReviews;
}

// Hàm escape giá trị CSV
function escapeCSV(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Hàm xuất ra file CSV
function exportToCSV(allResults, filename) {
  const rows = [];
  
  // Header - chỉ những cột cần thiết
  const headers = [
    'App ID',
    'User Name',
    'Date',
    'Score',
    'Review Text',
    'Version',
    'Country'
  ];
  
  rows.push(headers.map(h => escapeCSV(h)).join(','));

  // Data rows
  for (const result of allResults) {
    for (const review of result.reviews) {
      const row = [
        result.appId,
        review.userName,
        review.updated || review.date, // iOS dùng 'updated' field
        review.score,
        review.text,
        review.version,
        extractCountry(review)
      ];
      
      rows.push(row.map(v => escapeCSV(v)).join(','));
    }
  }

  fs.writeFileSync(filename, rows.join('\n'), 'utf-8');
  console.log(`\n💾 Đã lưu vào file: ${filename}`);
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('   iOS APP STORE REVIEWS SCRAPER');
  console.log('='.repeat(60));
  
  // Hỏi danh sách app IDs
  const input = await question('\n📱 Nhập danh sách App IDs (cách nhau bởi dấu phẩy):\n> ');
  
  // Parse app IDs
  const appIds = parseAppIds(input);
  
  if (appIds.length === 0) {
    console.error('\n❌ Không có app ID hợp lệ!');
    rl.close();
    process.exit(1);
  }

  console.log(`\n✅ Tìm thấy ${appIds.length} app(s):`);
  appIds.forEach((id, index) => {
    console.log(`   ${index + 1}. ${id}`);
  });

  // Danh sách các quốc gia phổ biến (tự động crawl)
  const countries = [
    'US',  // United States
    'VN',  // Vietnam
    'GB',  // United Kingdom
    'DE',  // Germany
    'FR',  // France
    'JP',  // Japan
    'KR',  // South Korea
    'IN',  // India
    'BR',  // Brazil
    'CA',  // Canada
    'AU',  // Australia
    'IT',  // Italy
    'ES',  // Spain
    'MX',  // Mexico
    'TH',  // Thailand
    'ID',  // Indonesia
    'PH',  // Philippines
    'SG',  // Singapore
    'MY',  // Malaysia
    'TW',  // Taiwan
  ];

  // Hỏi số lượng reviews cần crawl mỗi country
  const limitInput = await question('\n📊 Số lượng reviews mỗi country (mặc định 50): ');
  const limitPerCountry = parseInt(limitInput) || 50;

  console.log(`\n✅ Sẽ crawl từ ${countries.length} countries: ${countries.join(', ')}`);
  console.log(`✅ Số lượng mỗi country: ${limitPerCountry} reviews`);
  console.log(`✅ Tổng reviews dự kiến mỗi app: ~${countries.length * limitPerCountry}`);

  console.log('\n' + '='.repeat(60));
  console.log('   BẮT ĐẦU CRAWL');
  console.log('='.repeat(60));

  // Crawl từng app
  const allResults = [];
  
  for (const appId of appIds) {
    const reviews = await scrapeReviews(appId, countries, limitPerCountry);
    if (reviews.length > 0) {
      allResults.push({
        appId: appId,
        reviews: reviews
      });
    }
  }

  // Xuất ra CSV
  if (allResults.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `reviews_ios_${timestamp}.csv`;
    exportToCSV(allResults, filename);
    
    // Thống kê
    const totalReviews = allResults.reduce((sum, app) => sum + app.reviews.length, 0);
    console.log('\n' + '='.repeat(60));
    console.log('   HOÀN THÀNH');
    console.log('='.repeat(60));
    console.log(`📊 Tổng số apps: ${allResults.length}`);
    console.log(`📊 Tổng số reviews: ${totalReviews}`);
    console.log(`📄 File: ${filename}`);
  } else {
    console.log('\n⚠️  Không có dữ liệu để xuất');
  }

  rl.close();
}

// Chạy chương trình
main().catch(error => {
  console.error('\n❌ Lỗi:', error.message);
  rl.close();
  process.exit(1);
});


