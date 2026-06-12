# 🎬 AI Cinematic OS - Hệ thống Điều phối Quy trình Sản xuất Điện ảnh AI

Chào mừng bạn đến với **AI Cinematic OS** — Hệ thống điều phối quy trình làm việc (Workflow Engine) AI chuyên nghiệp tối ưu hóa cho các tác vụ lập kịch bản điện ảnh, xây dựng kịch bản phân cảnh (Storyboard), và tạo hình ảnh minh họa chất lượng cao.

Dự án sở hữu giao diện kính mờ (glassmorphic) hiện đại tích hợp cơ chế theo dõi tiến trình thời gian thực, trợ lý giám sát thông minh và bảng biên tập **Human-in-the-Loop (Con người kiểm soát)** giúp tối ưu hóa công tác sáng tạo nghệ thuật.

---

## 🎨 Sơ đồ luồng hoạt động hệ thống

Quy trình điều phối hoạt động phối hợp giữa người dùng, hệ thống API Router và các mô hình xử lý được biểu diễn qua sơ đồ dưới đây:

```mermaid
graph TD
  User["Người dùng (User)"] -- "1. Nhập ý tưởng & Chọn Template" --> UI["Dashboard UI (Plus Jakarta Sans / Outfit)"]
  UI -- "2. Gọi API tuần tự từng bước" --> Router["Smart API Router (/api/workflow/execute-step)"]
  Router -- "3. Tự động định tuyến (Gemini, Claude, DeepSeek, Ollama...)" --> AIProvider["Text AI Provider"]
  AIProvider -- "4. Trả luồng dữ liệu (SSE Stream)" --> Broadcaster["SSE Broadcaster (Express)"]
  
  Broadcaster -- "5a. Live text-typing effect trên giao diện" --> UI
  Broadcaster -- "5b. Cập nhật trạng thái tiến trình thời gian thực" --> Assistant["Trợ lý ảo giám sát tiến trình (AI Assistant)"]
  
  UI -- "6. Tạm dừng quy trình (Human-in-the-Loop)" --> Editor["Editorial Board (Bảng biên tập)"]
  
  Editor -- "7a. Nhập chỉ dẫn chỉnh sửa & bấm Viết Lại" --> Rewrite["Yêu cầu AI chỉnh sửa"]
  Rewrite --> Router
  
  Editor -- "7b. Biên tập trực tiếp & bấm Duyệt & Tiếp tục" --> StepNext["Bước tiếp theo (Tạo Prompts / Sinh ảnh 🎨)"]
  StepNext -- "8. Tạo ảnh phân cảnh" --> ImageGen["Image Engine (AUTOMATIC1111 / ComfyUI)"]
  ImageGen --> UI
```

---

## ✨ Các tính năng nổi bật

### 1. Giao diện Kính mờ (Glassmorphic UI) Trực quan
*   **Thiết kế hiện đại:** Giao diện được tối ưu hóa với hiệu ứng kính mờ nâng cao sử dụng thuộc tính `backdrop-filter: blur(14px)`.
*   **Trải nghiệm hiển thị sắc nét:** Sử dụng các bộ font chữ chất lượng cao gồm `Plus Jakarta Sans` và `Outfit`. Các thành phần chữ in đậm được tối ưu hóa hiển thị và giảm độ nhòe nền (từ 35px xuống 24px trên lớp nền ảnh) để đảm bảo khả năng đọc tốt nhất trên mọi loại màn hình.
*   **Tối ưu cấu trúc phân lớp:** Lớp phủ màu chuyển sắc `.card::before` được điều chỉnh `z-index: -1` để loại bỏ hoàn toàn hiện tượng đè chữ hoặc mờ chữ.

### 2. Trợ lý Giám sát Tiến trình Thời gian thực (Live AI Assistant)
*   **Hiển thị trực quan:** Tích hợp mô-đun trạng thái trực quan hiển thị thông tin xử lý thời gian thực thông qua bong bóng trạng thái.
*   **Theo dõi số liệu trực tiếp:** Khi hệ thống tiếp nhận luồng dữ liệu (SSE stream) từ AI, trợ lý ảo sẽ đếm số từ đã tạo theo thời gian thực và trích xuất hiển thị nội dung xem trước giúp người dùng nắm bắt tiến độ chính xác.

### 3. Quy trình cộng tác Con người - AI (Human-in-the-Loop Editorial Board)
*   Hệ thống không chạy tự động mù quáng từ đầu đến cuối mà cung cấp quyền kiểm soát tuyệt đối cho người dùng:
    *   **Pause & Inspect:** Tạm dừng ở cuối mỗi bước sinh kịch bản văn bản để người dùng đánh giá chất lượng.
    *   **Direct Editing:** Cho phép người dùng chỉnh sửa trực tiếp nội dung văn bản thô hoặc cấu trúc JSON ngay tại chỗ.
    *   **Natural Language Rewrite:** Người dùng có thể nhập chỉ dẫn bằng ngôn ngữ tự nhiên (ví dụ: *"Làm đoạn kết kịch tính và có hậu hơn"*) rồi bấm **Viết Lại**. Hệ thống sẽ tự động ghép nối chỉ dẫn này với kịch bản gốc và gọi AI cập nhật lại bước đó.
    *   **Approve & Feed-forward:** Khi ưng ý, người dùng bấm **Duyệt & Tiếp tục**, kết quả này lập tức được làm dữ liệu đầu vào ngữ cảnh (context) cho bước tiếp theo.

### 4. Tốc độ phản hồi tối ưu (Local LLM Tags Caching)
*   Hệ thống thiết lập bộ đệm in-memory cache (`CACHE_TTL = 30000ms`) cho việc liệt kê danh sách mô hình từ **Ollama** ở máy cục bộ, tránh tình trạng dashboard bị gián đoạn hoặc mất nhiều giây để tải danh sách thẻ tags mỗi khi người dùng truy cập hoặc gọi sinh văn bản.

---

## 📂 Kiến trúc thư mục và tài nguyên cốt lõi

Dự án được phát triển theo mô hình Client-Server gọn gàng và dễ mở rộng:

```text
ai-cinematic-os/
│
├── server/                     # BACK-END (Node.js & Express)
│   ├── index.js                # Khởi chạy Server, cấu hình SSE Broadcaster & Middleware
│   ├── config.js               # Quản lý các biến môi trường, API keys và cấu hình model mặc định
│   ├── routes/                 # Các tuyến API endpoint
│   │   ├── workflow.js         # API điều phối đơn bước (/execute-step) và toàn bộ workflow
│   │   ├── ai.js               # Gọi sinh văn bản và chat đa nhà cung cấp
│   │   └── image.js            # Kết nối AUTOMATIC1111 và ComfyUI
│   └── services/               # Logic nghiệp vụ xử lý tích hợp
│       ├── workflow-engine.js  # Bộ máy phân tích, chạy kịch bản tuần tự và stream kết quả
│       ├── router.js           # Smart Router tự động chọn AI tối ưu cho từng loại tác vụ
│       └── ollama.js           # Kết nối mô hình LLM nội bộ (Ollama) có cache tags (30s)
│
├── public/                     # FRONT-END (SPA & Asset Tĩnh)
│   ├── index.html              # Shell duy nhất của ứng dụng SPA (sử dụng cache-buster v=2.5)
│   ├── css/                    # Hệ thống định kiểu UI Token
│   │   ├── variables.css       # Các biến token màu, font chữ tương phản, bóng mờ neon
│   │   ├── base.css            # Khởi tạo nền kính mờ tương phản cao (blur 24px từ 357159.jpg)
│   │   └── components.css      # Cấu hình card chống mờ chữ, nút phát sáng, thanh tiến trình
│   └── js/
│       ├── app.js              # Kích hoạt & định tuyến hiển thị các panel
│       ├── api.js              # Client HTTP thực hiện các cuộc gọi Axios/Fetch
│       ├── components/         # Các Widget cấu thành giao diện SPA
│       │   └── workflow-panel.js # Bảng điều khiển quy trình 3 cột (Trợ lý AI + Bảng biên tập)
│       └── utils/
│           └── sse.js          # Client lắng nghe SSE, tiếp nhận sự kiện 'workflow:step:progress'
│
├── img/                        # Chứa các tài nguyên hình ảnh nền tĩnh (357159.jpg)
├── data/                       # Lưu trữ file JSON cấu hình API keys cục bộ (keys.json)
└── output/                     # Thư mục lưu trữ hình ảnh được tạo ra từ Stable Diffusion
```

> [!NOTE]
> Bạn có thể trực tiếp tham khảo các tệp cấu hình giao diện quan trọng tại:
> *   Bộ định nghĩa token màu: [variables.css](public/css/variables.css)
> *   Thiết lập ảnh nền và độ tương phản: [base.css](public/css/base.css)
> *   Thiết kế card tránh đè lớp chữ: [components.css](public/css/components.css)
> *   Logic Front-end điều khiển Trợ lý AI và bảng biên tập: [workflow-panel.js](public/js/components/workflow-panel.js)

---

## 🛠️ Hướng dẫn cài đặt & Cấu hình nhanh

### 1. Chuẩn bị môi trường & Tải dự án
*   Cài đặt **Node.js** phiên bản 18 trở lên.
*   Cài đặt **Python 3.10.x** (Khuyến nghị phiên bản **Python 3.10.6** để đạt độ tương thích tốt nhất với AUTOMATIC1111 và ComfyUI). Hãy chắc chắn tích chọn **"Add Python to PATH"** trong quá trình cài đặt.
*   Cài đặt **FFmpeg** và cấu hình thêm thư mục `bin` của nó vào biến môi trường **PATH** của hệ thống (Đây là yêu cầu bắt buộc nếu bạn sử dụng các chức năng sinh chuyển động / video phân cảnh từ hình ảnh như AnimateDiff, Deforum trên ComfyUI hoặc AUTOMATIC1111).
*   Tải dự án về máy bằng Git:
    ```bash
    git clone https://github.com/usagiloves/-AI-Cinematic.git
    cd -AI-Cinematic
    ```

### 2. Cài đặt các gói phụ thuộc
Tại thư mục gốc của dự án, mở terminal và chạy lệnh:
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo một tệp tin mang tên `.env` ở thư mục gốc của dự án (tham khảo mẫu trong [.env.example](.env.example)):
```env
PORT=3000

# API Keys cho các dịch vụ đám mây (nếu có)
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here
CLAUDE_API_KEY=your_claude_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
SILICONFLOW_API_KEY=your_siliconflow_key_here

# Địa chỉ kết nối LLM nội bộ (Ollama)
OLLAMA_URL=http://localhost:11434

# Địa chỉ kết nối Stable Diffusion tạo ảnh
A1111_URL=http://localhost:7860
COMFYUI_URL=http://localhost:8188
```
> [!TIP]
> Ngoài việc cấu hình trực tiếp qua file `.env`, bạn cũng có thể mở Dashboard của dự án lên và nhập trực tiếp các API Key này thông qua tab **API Keys** trên thanh Sidebar. Các khóa này sẽ được mã hóa và lưu trữ cục bộ vào file `data/keys.json`.

### 4. Cấu hình các dịch vụ tích hợp (Tùy chọn)

#### A. Trợ lý chạy Offline với Ollama (LLM Cục bộ)
1. Tải và cài đặt Ollama từ trang chủ: [https://ollama.com](https://ollama.com).
2. Tải mô hình ngôn ngữ lớn (ví dụ: `qwen2.5` hoặc `llama3`):
   ```bash
   ollama run qwen2.5
   ```
3. Đảm bảo Ollama đang chạy tại địa chỉ mặc định `http://localhost:11434` trước khi khởi động server.

#### B. Tạo ảnh với AUTOMATIC1111 (Stable Diffusion WebUI)
1. Cài đặt Stable Diffusion WebUI theo hướng dẫn từ trang chủ.
2. Để tích hợp với Dashboard này, bạn cần kích hoạt API bằng cách chỉnh sửa file khởi động `webui-user.bat` (trên Windows), thêm cờ `--api` và `--cors-allow-origins=*` vào dòng `COMMANDLINE_ARGS`:
   ```bat
   set COMMANDLINE_ARGS=--api --cors-allow-origins=* --enable-insecure-extension-access
   ```
3. Chạy file `webui-user.bat` để khởi động WebUI. Địa chỉ mặc định là `http://localhost:7860`.

#### C. Tạo ảnh với ComfyUI
1. Tải và cài đặt ComfyUI.
2. Khởi chạy ComfyUI bình thường (mặc định tại `http://localhost:8188`).
3. Đảm bảo bạn có sẵn mô hình checkpoint tương ứng trong thư mục `models/checkpoints/` của ComfyUI.

---

## 🚀 Khởi chạy dự án

Bắt đầu chạy server Node.js ở chế độ phát triển:
```bash
npm run dev
```
Hoặc chạy ở chế độ production:
```bash
npm start
```

Sau khi server khởi động thành công:
1. Mở trình duyệt web và truy cập: `http://localhost:3000`
2. Giao diện **AI Cinematic OS** dạng kính mờ (glassmorphic) hiện đại sẽ xuất hiện.
3. Truy cập menu **API Keys** trên thanh Sidebar để điền các khóa API mong muốn.
4. Truy cập menu **Workflow**, chọn một Template (như *Anime Script Generator*), nhập ý tưởng và theo dõi tiến trình thực thi tự động.

---

## 📋 Chi tiết các API Endpoint chính

Dưới đây là bảng tổng hợp các endpoint API mà hệ thống cung cấp phục vụ cho việc điều khiển và lấy trạng thái:

### 1. Nhóm API điều phối quy trình (Workflow Engine)
| Phương thức | Đường dẫn API | Tham số đầu vào (JSON) | Mô tả tính năng |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/workflow/execute` | `{ "templateId": "...", "input": "..." }` | Chạy tự động toàn bộ quy trình từ đầu đến cuối. |
| **POST** | `/api/workflow/execute-step` | `{ "templateId": "...", "stepIndex": 0, "input": "...", "prevResults": {} }` | Chạy duy nhất một bước cụ thể, hỗ trợ Human-in-the-Loop. |
| **GET** | `/api/workflow/templates` | *Không có* | Trả về danh sách tất cả các quy trình mẫu sẵn có. |
| **GET** | `/api/workflow/status/:id` | *Không có* | Lấy trạng thái tiến trình thực thi của một ID workflow. |

### 2. Nhóm API điều khiển Trí tuệ Nhân tạo Văn bản (Text LLM)
| Phương thức | Đường dẫn API | Tính năng |
| :--- | :--- | :--- |
| **POST** | `/api/ai/generate` | Sinh văn bản một lần từ nhà cung cấp được cấu hình sẵn. |
| **POST** | `/api/ai/chat` | Chat hội thoại liên tục (hỗ trợ lưu ngữ cảnh lịch sử). |
| **GET** | `/api/ai/stream` | Stream ký tự phản hồi từ mô hình LLM theo thời gian thực. |

### 3. Nhóm API tạo hình ảnh (Image Generator)
| Phương thức | Đường dẫn API | Tính năng |
| :--- | :--- | :--- |
| **POST** | `/api/image/txt2img` | Chuyển văn bản thành hình ảnh qua A1111 hoặc ComfyUI. |
| **POST** | `/api/image/img2img` | Biến đổi hình ảnh cũ kèm prompt thành hình ảnh mới. |
| **GET** | `/api/image/models` | Liệt kê danh sách các checkpoints đang được tải trên Stable Diffusion. |
| **POST** | `/api/image/interrupt` | Dừng khẩn cấp công việc sinh hình ảnh đang chạy giữa chừng. |
| **GET** | `/api/image/history` | Xem lịch sử toàn bộ các tác phẩm ảnh đã tạo và lưu cục bộ. |

---

## 💡 Cơ chế tối ưu hóa cục bộ

Hệ thống được thiết kế đặc biệt hướng tới việc chạy các mô hình AI cục bộ gọn nhẹ nhằm bảo mật dữ liệu và tiết kiệm chi phí:

### Định tuyến thông minh có dự phòng (Smart Fallback Router)
Khi gửi yêu cầu văn bản hoặc hình ảnh, Smart Router tại [router.js](server/services/router.js) hoạt động theo nguyên lý ưu tiên:
1.  Tìm kiếm nhà cung cấp dịch vụ được ưu tiên hàng đầu theo loại tác vụ (ví dụ: `gemini` cho tác vụ viết kịch bản dài, hoặc `openai` cho viết prompts).
2.  Kiểm tra xem API Key của nhà cung cấp đó có khả dụng không.
3.  Nếu không khả dụng hoặc bị lỗi phản hồi quá hạn (timeout), router sẽ tự động chuyển sang nhà cung cấp kế tiếp trong chuỗi thứ tự (Fallback Chain).
4.  Nhà cung cấp cục bộ **Ollama** luôn nằm ở cuối danh sách dự phòng để đảm bảo hệ thống luôn hoạt động ngay cả khi ngắt kết nối Internet toàn cầu.

### Bộ đệm in-memory cho các thẻ tags Ollama
Mỗi khi khởi động hoặc truy cập trang, hệ thống cần biết danh sách mô hình offline đang được cài trong Ollama. Thay vì gọi API liên tục gây thắt nút cổ chai (bottleneck) đường truyền mạng nội bộ, tệp [ollama.js](server/services/ollama.js) áp dụng mô hình lưu trữ tạm thời:
```javascript
let cachedModels = null;
let lastModelsFetch = 0;
const CACHE_TTL = 30000; // Bộ đệm tồn tại trong 30 giây

async function getModels() {
  const now = Date.now();
  if (cachedModels && (now - lastModelsFetch < CACHE_TTL)) {
    return cachedModels; // Trả ngay dữ liệu trong bộ nhớ cache
  }
  // Nếu quá 30 giây, tiến hành gọi API thật để cập nhật mới...
}
```

---

## 💙 Ghi chú dành cho người phát triển

*   **Không sử dụng TailwindCSS:** Giao diện được xây dựng 100% bằng Vanilla CSS và HSL Color Tokens thiết lập trong [variables.css](public/css/variables.css). Khi muốn thay đổi bảng màu hoặc font chữ hệ thống, vui lòng chỉ khai báo hoặc chỉnh sửa các CSS variables tương ứng.
*   **Tránh đè lớp phủ (z-index):** Khi thiết kế thêm các thẻ card (`.card`) hoặc panel mới, luôn đảm bảo các thẻ con của card có vị trí tương đối và không bị lớp giả `.card::before` che mờ.
*   **Sử dụng cache-buster khi chỉnh sửa frontend:** Toàn bộ liên kết script JS/CSS tĩnh trong [index.html](public/index.html) đều đi kèm tham số phiên bản `?v=2.5`. Sau khi sửa đổi front-end, hãy cập nhật số phiên bản này để tránh lỗi lưu đệm (browser caching) trên trình duyệt người dùng.

Dự án này là sự kết hợp tối ưu giữa **Thiết kế giao diện hiện đại (Modern UI Design)** và **Quy trình điều hành thông minh do con người kiểm soát (Human-in-the-Loop AI Orchestration)**. Hãy bắt đầu xây dựng quy trình sản xuất điện ảnh tự động của bạn ngay hôm nay! 🎬
