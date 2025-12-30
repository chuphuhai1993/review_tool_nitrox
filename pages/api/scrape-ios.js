import store from 'app-store-scraper';

// Parse danh sách app IDs từ input
function parseAppIds(input) {
  if (!input || typeof input !== 'string') {
    return [];
  }
  const appIds = input.split(',').map(id => id.trim()).filter(id => id.length > 0);
  return [...new Set(appIds)];
}

// Hàm trích xuất quốc gia từ review data
function extractCountry(review) {
  return review.country || 'Unknown';
}

// Hàm crawl reviews cho một app từ một country cụ thể
async function scrapeReviewsFromCountry(appId, country, limit = 100) {
  try {
    const reviews = [];
    let page = 1;

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

      const reviewsWithCountry = result.map(review => ({ ...review, country }));
      reviews.push(...reviewsWithCountry);
      page++;

      if (result.length < 50 || reviews.length >= limit) {
        break;
      }
    }

    return reviews.slice(0, limit);
  } catch (error) {
    console.error(`Error scraping ${appId} from ${country}: ${error.message}`);
    return [];
  }
}

// Hàm crawl reviews từ nhiều quốc gia
async function scrapeReviews(appId, countries, limitPerCountry) {
  const allReviews = [];
  for (const country of countries) {
    const reviews = await scrapeReviewsFromCountry(appId, country, limitPerCountry);
    allReviews.push(...reviews);
  }
  return allReviews;
}

// Hàm escape giá trị CSV
function escapeCSV(value) {
  const str = String(value || '');
  if (str.includes(',') || str.includes('\" ') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Hàm tạo nội dung CSV
function createCSV(allResults) {
  const rows = [];
  const headers = ['App ID', 'User Name', 'Date', 'Score', 'Review Text', 'Version', 'Country'];
  rows.push(headers.map(escapeCSV).join(','));

  for (const result of allResults) {
    for (const review of result.reviews) {
      const row = [
        result.appId,
        review.userName,
        review.updated || review.date,
        review.score,
        review.text,
        review.version,
        extractCountry(review)
      ];
      rows.push(row.map(escapeCSV).join(','));
    }
  }

  return rows.join('\n');
}

export default async function handler(req, res) {
  const { appIds: appIdsQuery, limit } = req.query;
  const appIds = parseAppIds(appIdsQuery);

  if (appIds.length === 0) {
    return res.status(400).json({ error: 'No valid app IDs provided' });
  }

  const countries = ['US', 'VN', 'GB', 'DE', 'FR', 'JP', 'KR', 'IN', 'BR', 'CA', 'AU', 'IT', 'ES', 'MX', 'TH', 'ID', 'PH', 'SG', 'MY', 'TW'];
  const limitPerCountry = parseInt(limit) || 50;

  const allResults = [];
  for (const appId of appIds) {
    const reviews = await scrapeReviews(appId, countries, limitPerCountry);
    if (reviews.length > 0) {
      allResults.push({ appId, reviews });
    }
  }

  if (allResults.length === 0) {
    return res.status(200).send('No reviews found for the given app IDs.');
  }

  const csvData = createCSV(allResults);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `reviews_ios_${timestamp}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvData);
}
