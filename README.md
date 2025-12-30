# App Reviews Scraper - Next.js Web App

Công cụ crawl reviews từ Google Play Store (Android) và iOS App Store, đã được chuyển đổi thành một ứng dụng web Next.js.

## Cài đặt và Chạy

1.  **Cài dependencies:**
    ```bash
    npm install
    ```

2.  **Chạy development server:**
    ```bash
    npm run dev
    ```

3.  **Mở trình duyệt:**
    Vào địa chỉ [http://localhost:3000](http://localhost:3000) để sử dụng công cụ.

## Cách sử dụng Web App

1.  **Nhập App IDs**: Dán danh sách App IDs (cách nhau bởi dấu phẩy) vào ô textarea.
    -   **Android**: Dùng package name (ví dụ: `com.whatsapp`).
    -   **iOS**: Dùng numeric ID (ví dụ: `310633997`).

2.  **Chọn số lượng**: Nhập số lượng reviews muốn crawl cho mỗi quốc gia (mặc định là 50).

3.  **Bắt đầu Scrape**: Nhấn nút "Scrape Android" hoặc "Scrape iOS" để bắt đầu.

4.  **Tải file CSV**: Sau khi hoàn tất, trình duyệt sẽ tự động tải về một file `.csv` chứa tất cả các reviews.

## Cấu trúc dự án

-   `pages/index.js`: Giao diện người dùng (frontend) được xây dựng bằng React.
-   `pages/api/scrape-android.js`: API route để xử lý việc crawl reviews từ Google Play Store.
-   `pages/api/scrape-ios.js`: API route để xử lý việc crawl reviews từ App Store.
-   `scraper.js`, `scraper-ios.js`: Các file script gốc (CLI) vẫn được giữ lại.

## Script cũ (Legacy)

Nếu bạn vẫn muốn sử dụng phiên bản dòng lệnh (CLI) cũ, bạn có thể chạy các lệnh sau:

-   **Android**:
    ```bash
    npm run legacy:android
    ```
-   **iOS**:
    ```bash
    npm run legacy:ios
    ```

## Dependencies

-   **Next.js**, **React**: Framework để xây dựng ứng dụng web.
-   **google-play-scraper**: Library để crawl dữ liệu từ Google Play Store.
-   **app-store-scraper**: Library để crawl dữ liệu từ iOS App Store.

## License

MIT
