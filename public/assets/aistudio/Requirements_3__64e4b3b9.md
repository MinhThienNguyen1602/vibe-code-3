Hãy đóng vai một kỹ sư Frontend chuyên xây dựng học liệu Toán học tương tác. Hãy tạo cho tôi ứng dụng web một trang mang tên **"Trực Quan Hóa Vị Trí Dãy Số Liệu & Tứ Phân Vị" (Ordered Data & Quartile Explorer)** chạy hoàn toàn ở phía client (không dùng API ngoài, dùng HTML5, CSS thuần và Vanilla JavaScript).

### 1. Yêu cầu kiến trúc, bảo mật & Tách file (Quan trọng)
- Xuất ra mã nguồn tách biệt rõ ràng thành **3 file riêng biệt**:
  1. `index.html`: Khung HTML ngữ nghĩa, không chứa CSS inline hay mã JS nội tuyến.
  2. `style.css`: Toàn bộ định dạng giao diện, liên kết qua `<link rel="stylesheet" href="style.css">`.
  3. `app.js`: Toàn bộ logic xử lý, kiểm thử đầu vào và dựng hình SVG/DOM, liên kết qua `<script src="app.js" defer></script>`.
- Toàn bộ giao diện bọc trong container gốc có class `.data-axis-app` và tiền tố class CSS là `.da-` để cô lập style, tránh xung đột khi nhúng làm module trong trang web lớn.
- Trong `app.js`, tách bạch hoàn toàn 3 tầng: (1) Bộ lọc & chuẩn hóa dữ liệu đầu vào, (2) Các hàm tính toán thống kê thuần túy & quy đổi tọa độ, và (3) Tầng dựng hình SVG. Tuyệt đối không viết cứng mã màu (hex/rgb) trong `app.js` hoặc thẻ `<svg>`; mọi trạng thái màu sắc điều khiển thông qua **class CSS** và biến CSS.
- **Bảo mật & Chống XSS:** Tuyệt đối không sử dụng `.innerHTML` để hiển thị chuỗi do người dùng nhập vào hoặc thông báo lỗi; bắt buộc dùng `.textContent` để gắn văn bản vào DOM.

### 2. Kế thừa hệ thống màu & Giao diện đồng bộ
Hãy sử dụng chính xác bộ biến màu và thông số thẩm mỹ dưới đây trong `style.css` để đồng bộ hoàn toàn với các học liệu trước đó của tôi:
```css
.data-axis-app {
  --da-bg-canvas: #f4f6f9;
  --da-bg-surface: #ffffff;
  --da-bg-subtle: #f8fafc;
  --da-bg-muted: #f1f5f9;
  --da-border-hairline: #e2e8f0;
  --da-border-strong: #cbd5e1;

  --da-text-primary: #0f172a;
  --da-text-secondary: #475569;
  --da-text-muted: #64748b;

  /* Dùng cho Dãy số liệu đã sắp xếp & Đường nối */
  --da-blue-solid: #2563eb;
  --da-blue-soft: #eff6ff;
  --da-blue-border: #bfdbfe;

  /* Dùng cho Tứ phân vị Q1, Q3 & Vùng khoảng tứ phân vị (IQR) */
  --da-amber-solid: #d97706;
  --da-amber-soft: #fffbeb;
  --da-amber-border: #fde68a;

  /* Dùng cho Trung vị (Q2) & Khung giải thích */
  --da-green-solid: #15803d;
  --da-green-deep: #14532d;
  --da-green-soft: #f0fdf4;
  --da-green-border: #bbf7d0;

  --da-radius-lg: 14px;
  --da-radius-md: 10px;
  --da-radius-sm: 7px;
  --da-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 16px rgba(15, 23, 42, 0.04);
  --da-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 3. Luồng tương tác (Input -> Output)

#### A. Khu vực đầu vào (Input) & Xác thực 3 tầng
1. **Ô nhập chuỗi số liệu:** Một trường nhập liệu (`<input type="text">` hoặc `<textarea>` gọn) cho phép nhập các số thực ngăn cách bởi dấu chấm phẩy `;` (ví dụ: `12; 15; 10; 22; 18; 15; 25`) đi kèm nút **"Vẽ biểu đồ"**.
2. **Quy trình kiểm tra đầu vào 3 tầng:**
   - **Tầng 1 (Whitelist Regex):** Chỉ chấp nhận các ký tự `0-9`, `.`, `-`, `;` và khoảng trắng. Từ chối ngay lập tức nếu chuỗi chứa chữ cái, ký tự đặc biệt hoặc thẻ HTML.
   - **Tầng 2 (Chuẩn hóa phần tử):** Tách chuỗi bằng dấu `;`, dùng `.trim()` loại khoảng trắng thừa, bỏ qua phần tử rỗng ở cuối chuỗi (nếu có dấu `;` dư), kiểm tra từng phần tử khớp mẫu số thực hợp lệ `^-?\d+(\.\d+)?$` và `Number.isFinite()`.
   - **Tầng 3 (Giới hạn kích thước mẫu):** Yêu cầu số lượng phần tử $n$ nằm trong khoảng từ $3$ đến $40$. Nếu sai định dạng hoặc ngoài phạm vi cho phép, hiển thị thông báo lỗi an toàn bằng `.textContent` và giữ nguyên trạng thái đồ thị hiện tại.
3. **Bộ dữ liệu mẫu (Presets):** 4 nút bấm nạp nhanh bộ số liệu và tự động vẽ biểu đồ ngay lập tức:
   - *Mẫu lẻ ($n=9$)*
   - *Mẫu chẵn ($n=10$)*
   - *Mẫu có ngoại lai*
   - *Mẫu có số âm & thập phân*

#### B. Khu vực hiển thị trực quan & Kết quả (Output)
1. **Checklist tùy chọn lớp hiển thị (cho phép bật/tắt đồng thời nhiều lớp):**
   - `[x]` Dãy số liệu sắp thứ tự không giảm
   - `[x]` Đường & điểm Trung vị ($Q_2$)
   - `[x]` Tứ phân vị ($Q_1, Q_3$) & Vùng khoảng tứ phân vị ($\Delta_Q$)
2. **Mặt phẳng tọa độ SVG co giãn tự động:**
   - **Trục hoành ($X$):** Thể hiện vị trí thứ hạng từ $1$ đến $n$ (kích thước mẫu), kèm đường gióng dọc mờ từ trục $X$ lên từng điểm dữ liệu.
   - **Trục tung ($Y$):** Tự động co giãn theo miền giá trị từ $y_{\min}$ đến $y_{\max}$ của dãy số (có khoảng đệm 12% ở hai đầu; tự động căn giữa an toàn nếu tất cả phần tử bằng nhau).
   - **Biểu diễn dãy số liệu:** Sắp xếp dãy số theo thứ tự không giảm $x_{(1)} \le x_{(2)} \le \dots \le x_{(n)}$, vẽ các điểm tròn nối với nhau bằng đường gấp khúc tông xanh dương (`--da-blue-*`). Khi di chuột hoặc chạm vào một điểm, hiển thị tooltip gọn chỉ gồm 2 thông tin: **Vị trí: $i$** và **Giá trị: $x_{(i)}$**.
   - **Trực quan hóa Trung vị ($Q_2$) & Tứ phân vị ($Q_1, Q_3$) theo chuẩn SGK Toán Việt Nam:**
     - *Công thức xác định:* Nếu $n$ lẻ ($n=2k+1$), $Q_2 = x_{(k+1)}$; nếu $n$ chẵn ($n=2k$), $Q_2 = \frac{x_{(k)} + x_{(k+1)}}{2}$. Chia dãy đã sắp xếp thành hai nửa không bao gồm $Q_2$ (nếu $n$ lẻ); $Q_1$ là trung vị của nửa dưới, $Q_3$ là trung vị của nửa trên.
     - *Thể hiện hình học:* Vẽ các đường gióng ngang nét đứt xuất phát từ trục tung tại các mức $Q_1, Q_2, Q_3$. Nếu mốc tứ phân vị rơi đúng vào một điểm dữ liệu thì tô nổi bật điểm đó; nếu rơi vào giữa hai vị trí liền kề (ví dụ vị trí $5.5$) thì vẽ đoạn nối trung điểm giữa hai điểm đó kèm dấu chấm mốc trung điểm.
     - *Khoảng tứ phân vị ($\Delta_Q$):* Tô một dải băng màu cam mờ (`--da-amber-*`) trải ngang giữa mức $Q_1$ và $Q_3$ để biểu diễn $\Delta_Q = Q_3 - Q_1$.
3. **Bảng phân tích thống kê & Giải thích sư phạm:**
   - Hiển thị dãy số **sau khi đã sắp thứ tự không giảm** có đánh chỉ số vị trí $1, 2, \dots, n$ bên trên/dưới từng giá trị.
   - Bảng tóm tắt các chỉ số: Kích thước mẫu ($n$), Tứ phân vị dưới ($Q_1$), Trung vị ($Q_2$), Tứ phân vị trên ($Q_3$), và Khoảng tứ phân vị ($\Delta_Q$).
   - Hộp giải thích tự động diễn giải bằng lời từng bước xác định vị trí của $Q_2, Q_1, Q_3$ tương ứng với trường hợp $n$ chẵn hoặc $n$ lẻ của mẫu hiện tại.