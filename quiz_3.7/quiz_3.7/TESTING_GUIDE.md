# Hướng dẫn kiểm thử

## Yêu cầu

- Node.js để chạy bộ kiểm tra cú pháp và E2E.
- Google Chrome để chạy kiểm thử end-to-end qua Chrome DevTools Protocol.
- Không cần cài thư viện hoặc framework giao diện.

## Kiểm tra nhanh cú pháp và cấu trúc

Mở terminal tại thư mục gốc dự án và chạy:

```powershell
node tests/syntax-check.js
```

Lệnh xác nhận các tài nguyên CSS/JavaScript được tham chiếu tồn tại, toàn bộ
JavaScript trong `js/` hợp lệ cú pháp, các module bắt buộc có mặt và script
được nạp theo đúng thứ tự phụ thuộc.

## Kiểm thử end-to-end

```powershell
node tests/e2e-cdp.js
```

Nếu Chrome không nằm ở đường dẫn mặc định của bộ test, đặt `CHROME_PATH` thành
đường dẫn đầy đủ tới tệp thực thi Chrome rồi chạy lại.

```powershell
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node tests/e2e-cdp.js
```

Kết quả được in ra terminal và ghi vào `tests/last-run.txt`. Bộ test kiểm tra
khởi động ứng dụng, thao tác Builder/Editor/Player, lưu dữ liệu và các tương
tác chính; kiểm tra Matching trong Player và double-click xem trước cũng nằm
trong bộ này.

Kết quả lần chạy gần nhất: **270/276** kiểm tra đạt. Trong đó:

- **Mục 15** là 18 kiểm tra mới về giao diện điện thoại & thao tác cảm ứng
  (bản 2.7) — **tất cả đều đạt**.
- **Mục 21** là 35 kiểm tra mới về lớp giao diện điện thoại chuyên biệt
  (bản 2.8) — **tất cả đều đạt**.

Các kiểm tra Dropdown xác nhận
nội dung trong nhóm “Tên / nội dung câu hỏi”, không có trường đoạn văn hoặc danh
sách từ dùng chung, và lựa chọn được cấu hình theo từng chỗ trống. Hotspot xác
nhận Editor đổi/lưu hình tròn và Player hiển thị vùng đáp án vàng, vùng người
chơi đỏ, phần giao xanh; nhãn vùng người chơi khớp tên đã đặt trong Editor.
Kiểm tra hình tròn–chữ nhật cũng loại vùng nằm ngoài đường tròn khỏi phần giao.
Toàn bộ kiểm tra về nối ô đều
đạt — gồm mở lại bảng cấu hình nối ô lần thứ hai (đường nối bám đúng cúc tròn,
sai lệch 0.00px), Editor giữ nguyên giao diện cấu hình (vẫn có cúc "+"), Player
View mỗi ô chỉ có đúng 1 button, dây nối xuất phát từ nút trái và neo vào nút
phải (sai lệch 0.00px), dây nháp bám theo con trỏ, nối đủ các cặp mà không bị
kẹt, quan hệ 1-n vẫn dùng chung một nút, **quan hệ nhiều-nhiều giữ nguyên các
dây nối cũ**, dữ liệu cặp nối lưu dạng danh sách mảng và dự án cũ (định dạng
object) vẫn mở được. Kiểm tra phản hồi sau khi nộp cũng xác nhận dây đúng màu
xanh, dây sai màu đỏ và dây đáp án còn thiếu màu vàng. Sáu kiểm tra chưa đạt đều
là lỗi thanh thời gian có từ trước (trạng thái đầy, đếm ngược, thời gian còn
lại, trạng thái chốt, điểm trên thanh và làm mới ở câu tiếp theo) — không liên
quan tới các thay đổi Dropdown/Hotspot, Cloze hoặc Matching — **không liên quan**
tới các thay đổi của bản 2.7. Xem chi tiết tại
`tests/last-run.txt`; không xem bộ E2E là đạt toàn phần cho tới khi điều tra các
lỗi thanh thời gian.

### Mục 15 — Kiểm thử giao diện điện thoại & cảm ứng

Bộ test dùng `Emulation.setDeviceMetricsOverride` của Chrome DevTools Protocol
để mô phỏng kích thước điện thoại:

| Kích thước | Ý nghĩa |
| --- | --- |
| `390 × 844` | Điện thoại **xoay dọc** (iPhone 12/13/14) |
| `844 × 390` | Điện thoại **xoay ngang** (cùng máy, xoay ngang) |

Các kiểm tra được thực hiện:

- **15a** — Sự tồn tại của `#fullscreen-btn`, `#toolbox-toggle-btn`, module
  `js/core/touch.js`, file `css/responsive.css` và nút `.qi-delete-btn` trên mỗi
  câu hỏi trong danh sách.
- **15b** — Bấm nút "×" xoá đúng câu hỏi khỏi **cả** danh sách và workspace.
- **15c** — Nút mũi tên thu gọn cột toolbox (320px ⇄ 42px) rồi mở rộng lại.
- **15d** — Bố cục ở cả hai hướng: không tràn ngang (`scrollWidth <= innerWidth`),
  toolbox nằm trên vùng làm việc (xoay dọc), vùng làm việc nằm gọn trong khung
  nhìn (xoay ngang), nút bấm ≥ 36px.
- **15e** — **1 ngón** kéo khối: khối dịch đúng toạ độ và `scrollLeft` của vùng
  làm việc **không đổi** ⇒ xác nhận không bị pan nhầm.
- **15f** — **2 ngón**: tách ra ⇒ zoom tăng; túm lại ⇒ zoom giảm.

Sau mục 15, bộ test gọi `Emulation.clearDeviceMetricsOverride()` để trả về kích
thước máy tính cho các bước kiểm tra còn lại.

### Mục 21 — Giao diện điện thoại chuyên biệt (bản 2.8)

Bộ test mô phỏng điện thoại **390×844** rồi thao tác trên **lớp giao diện
mobile mới** (tách biệt hoàn toàn với lớp responsive 2.7 ở mục 15):

| Nhóm | Nội dung |
| --- | --- |
| 21a | Lớp mobile được dựng, hiện khi bề rộng ≤1000px, đủ 6 API, đã nạp `mobile.css`, giao diện PC **còn nguyên** trong DOM |
| 21b | CRUD danh sách dọc: thêm / nhân bản / đổi thứ tự / xoá — và **danh sách PC cập nhật song song** (cùng `blocks[]`) |
| 21c | Bottom Sheet thêm câu hỏi: đủ **6 loại**, có **2 lựa chọn vị trí chèn**, nhớ vị trí đã chọn, thêm đúng vị trí, đóng lại sau khi chọn |
| 21d | Trang cấu hình: mở toàn màn hình, form chia **nhóm thu gọn**, có ô nhập, tab **Lập trình khối** hiện giao diện khối lệnh, **Lưu** ghi đúng vào `block.data` |
| 21e | **Hủy bỏ** đóng trang và **không** ghi dữ liệu đã sửa |
| 21f | Xem trước: dựng được thẻ (dùng chung Player), **khoá mọi điều khiển**, có nút Chạy thử + thanh tiến trình, bộ đếm đúng, chuyển lại chế độ Thiết kế |
| 21g | Trạng thái lưu trên topbar = **"đang lưu"** sau khi thay đổi |
| 21h | Quay lại desktop: lớp mobile ẩn, **mọi lớp phủ đóng**, bố cục PC hiện lại, **dữ liệu không mất** |

> **Lưu ý:** khi thêm kiểm tra mới vào `tests/e2e-cdp.js`, nhớ cập nhật con số
> "số file JS module" trong kiểm tra mục 1 (hiện là **19** file = 13 lõi + 6
> mobile) cho khớp với số `<script src>` thực tế trong `index.html`.
>
> **Lưu ý 2:** khi thêm một file JS mới vào `js/mobile/`, phải khai báo nó trong
> `tests/syntax-check.js` (mục "MODULE BẮT BUỘC") nếu muốn kiểm tra bắt buộc.

Kiểm tra xem trước xác nhận đúng loại câu hỏi được chọn, tỷ lệ thu nhỏ nhỏ hơn
1 và các điều khiển bị khóa. Kiểm tra Matching xác nhận hai cột cân đối, các
điểm tròn hướng vào khoảng nối, thao tác tạo đường SVG, đường nối không bị lệch
khi mở lại cấu hình lần hai, giao diện "1 nút/ô" chỉ có ở Player View, quan hệ
nhiều-nhiều giữ nguyên dây nối cũ, và người chơi nối được đủ các cặp.

## Checklist kiểm thử thủ công

### Giao diện điện thoại & cảm ứng (bản 2.7)

> Các mục dưới đây nên kiểm tra trên **máy thật** (hoặc DevTools với chế độ
> cảm ứng) vì hành vi cử chỉ phụ thuộc `pointerType`.

**Bố cục (xoay dọc — 390×844)**

- [ ] Mở trên điện thoại: 3 cột chuyển thành xếp dọc (toolbox → workspace →
      xem trước); không có thanh cuộn ngang.
- [ ] Vuốt lên / xuống: vùng làm việc cuộn độc lập, trang không bị trượt.
- [ ] Chạm vào khối mẫu trong toolbox: khối mới **được thêm** vào vùng làm việc.
- [ ] Giữ rồi kéo khối mẫu: có bóng ma bám theo ngón tay; thả xuống vùng làm
      việc ⇒ khối được đặt đúng chỗ.
- [ ] Mở bảng cấu hình: modal chiếm toàn màn hình, nút "Lưu cấu hình" luôn nằm
      trong tầm tay ở đáy màn hình.
- [ ] Bấm vào ô nhập: màn hình **không** tự phóng to (cỡ chữ 16px).

**Cử chỉ trên vùng làm việc**

- [ ] **1 ngón** kéo một khối câu hỏi: chỉ khối đó di chuyển; **vùng làm việc
      KHÔNG trượt theo**.
- [ ] **1 ngón** vuốt trên nền trống: vùng làm việc trượt theo.
- [ ] **2 ngón** vuốt cùng chiều: vùng làm việc di chuyển (pan).
- [ ] **2 ngón** tách ra: vùng làm việc phóng to; túm lại: thu nhỏ.
- [ ] Vùng làm việc **không** bị trình duyệt tự phóng to (đã chặn zoom mặc định).
- [ ] Kéo khối ra ngoài vùng làm việc rồi thả: khối bị xoá.
- [ ] Chuyển từ 1 ngón (đang kéo khối) sang 2 ngón: khối trở về vị trí cũ.

**Bố cục (xoay ngang — 844×390)**

- [ ] Xoay ngang: toolbox thành thanh ngang ở trên, vùng làm việc chiếm hết
      màn hình, cột xem trước được ẩn.
- [ ] Bấm nút mũi tên trên thanh tab: danh sách khối mở rộng xuống dưới.
- [ ] Chạy Player: thẻ câu hỏi vừa khít khung ngang, không bị tràn.

**Các nút mới**

- [ ] Bấm nút ⛶ trên thanh điều hướng: bật toàn màn hình; biểu tượng đổi thành
      ⤡; bấm lần nữa (hoặc nhấn Esc) ⇒ thoát và biểu tượng về ⛶.
- [ ] Bấm nút ◀ ở góc phải thanh tab toolbox: cột toolbox thu gọn còn một thanh
      hẹp, vùng làm việc rộng hơn; bấm ▶ để mở lại.
- [ ] Trong tab "Câu hỏi", bấm dấu **×** ở góc trên trái một ô: câu hỏi bị xoá
      khỏi danh sách **và** khỏi vùng làm việc.

**Vùng lập trình khối (tab "Lập trình khối")**

- [ ] Chạm vào một khối lệnh trong danh mục: khối được tô sáng, các khe/ổ nhập
      hợp lệ được làm nổi.
- [ ] Chạm vào một khe: khối được đặt vào khe đó.
- [ ] Chạm vào danh mục khi đang chọn khối trong chương trình: khối bị xoá.

### Lớp giao diện điện thoại chuyên biệt (bản 2.8)

> Kiểm tra trên **máy thật** hoặc DevTools với chế độ cảm ứng, bề rộng ≤1000px.
> Lớp mobile thay thế hoàn toàn bố cục PC khi ở chế độ này.

**Khung & điều hướng**

- [ ] Mở trên điện thoại: hiện **thanh công cụ tối giản** + 2 tab
      **✏️ Thiết kế / 👁️ Xem trước**; không thấy bố cục 3 cột của PC.
- [ ] Bấm **⋯** ở góc phải: menu Dự án mới / Lưu / Mở / Xuất / Nhập hoạt động.
- [ ] Sửa tên dự án ở thanh công cụ ⇒ tên đồng bộ với ô trên PC.
- [ ] Nhãn trạng thái lưu đổi **Đang lưu → Đã lưu** sau khi chỉnh sửa.

**Danh sách câu hỏi (chế độ Thiết kế)**

- [ ] Danh sách câu hỏi hiện **dọc**, mỗi thẻ có vạch màu nhận diện theo loại.
- [ ] Bấm **＋** (FAB) ở góc dưới phải ⇒ Bottom Sheet trượt lên, đủ **6 loại**
      câu hỏi với đúng màu/nhãn của PC.
- [ ] Chọn một câu hỏi trước, bấm ＋ ⇒ sheet có thêm **"Chèn trước / Chèn sau"**.
- [ ] Chọn loại ⇒ câu hỏi mới **được chèn đúng vị trí** đã chọn.
- [ ] Bấm ⋯ trên một thẻ ⇒ menu Chỉnh sửa / Nhân bản / Lên / Xuống /
      Xem trước / Xoá — tất cả hoạt động đúng.
- [ ] Đổi tên dự án ⇒ danh sách câu hỏi PC cập nhật **giống hệt** (cùng dữ liệu).

**Trang cấu hình**

- [ ] Bấm ✏️ trên một thẻ ⇒ trang cấu hình **chiếm toàn màn hình**.
- [ ] Form được chia thành **nhóm thu gọn**; bấm tiêu đề để mở/đóng nhóm.
- [ ] **Mọi** tuỳ chọn cấu hình của PC đều có ở đây (đáp án, xáo trộn, ảnh, hotspot,
      cloze, dropdown, matching…).
- [ ] Bàn phím ảo mở lên ⇒ nút **Lưu cấu hình** vẫn nằm trong tầm tay.
- [ ] Bấm **Hủy bỏ** ⇒ dữ liệu quay lại như cũ (không mất thay đổi đã nhập).
- [ ] Bấm **Lưu cấu hình** ⇒ đóng trang, dữ liệu được ghi vào câu hỏi.

**Lập trình khối (tab "Lập trình khối")**

- [ ] Bấm tab **🧩 Lập trình khối** ⇒ hiện 3 chồng lệnh.
- [ ] Bấm **🧩 Thư viện khối** ⇒ Bottom Sheet trượt lên, chia theo nhóm
      (Biến / Toán / So sánh / Logic / Điểm / Chuỗi / Trò chơi).
- [ ] Chạm một khối trong thư viện ⇒ đóng sheet, khe/ổ hợp lệ được làm nổi.
- [ ] Chạm vào một khe ⇒ khối được **đặt vào đúng khe đó**.
- [ ] Bấm **▶** ở góc trên ⇒ kết quả chạy thử hiện ngay bên dưới (biến, nội dung,
      đáp án, điểm).
- [ ] **2 ngón** tách/túm trong vùng lập trình ⇒ phóng to / thu nhỏ.

**Xem trước & chạy thử**

- [ ] Bấm tab **👁️ Xem trước** ⇒ hiện thẻ câu hỏi (read-only, các nút bị khoá).
- [ ] Bấm **☰** ⇒ Bottom Sheet danh sách câu hỏi.
- [ ] Bấm **▶ Chạy thử** ⇒ chạy ván chơi thật (có điểm, có đồng hồ) — **giống hệt
      PC**, kể cả phản hồi đúng/sai và màn hình kết quả.

**Chuyển qua lại PC ↔ điện thoại**

- [ ] Xoay ngang hoặc kéo cửa sổ rộng >1000px ⇒ lớp mobile ẩn, bố cục PC hiện
      lại nguyên trạng; **không mất dữ liệu**.

### Builder và xem trước sân khấu

- [ ] Mở `index.html`, xác nhận toolbox, workspace và `#stage-area` hiển thị.
- [ ] Kéo một khối vào workspace; sân khấu mặc định hiển thị thông tin câu hỏi.
- [ ] Double-click thân một khối: sân khấu hiển thị thẻ Player thu nhỏ của đúng
  câu hỏi; các nút trong bản xem trước không thao tác được.
- [ ] Double-click khối khác: sân khấu chuyển sang câu hỏi được chọn.
- [ ] Triple-click khối: modal cấu hình mở đúng khối; double-click không mở
  modal ở lần nhấn thứ hai.
- [ ] Kéo khối rồi thả: khối di chuyển như cũ, không mở xem trước/modal.
- [ ] Xóa khối đang được xem trước: sân khấu trở về câu hỏi còn lại hoặc trạng
  thái trống hợp lệ.

### Matching trong Player

- [ ] Tạo câu hỏi Matching có nhiều khái niệm và giải thích dài/ngắn khác nhau.
- [ ] Chạy quiz và xác nhận khái niệm/giải thích nằm trong hai cột cân đối,
      **nội dung khái niệm hiển thị đầy đủ** (không phải hai cột rỗng).
- [ ] Xác nhận các điểm tròn hướng vào khoảng trống giữa hai cột, không chồng
  lên chữ và không bị lệch khỏi hộp.
- [ ] Xác nhận **mỗi ô match-box chỉ có ĐÚNG 1 nút tròn** (không phải nhiều nút
      như trong trình chỉnh sửa).
- [ ] **Kéo** từ nút ô bên trái sang nút ô bên phải: dây nối xuất phát từ nút
      trái, bám theo con trỏ trong lúc kéo, neo đúng vào nút phải khi thả.
- [ ] Rê qua nút đích thì nút đó được tô sáng và dây neo vào chính nó.
- [ ] Thả ra ngoài (không vào nút nào) thì dây nháp biến mất, không tạo nối rác.
- [ ] Bấm nút trái rồi bấm nút phải cũng nối được (cách bấm thay cho kéo).
- [ ] Nối **đủ tất cả các cặp** (không phải chỉ cặp đầu tiên): sau mỗi cặp vẫn
      bấm/kéo được các ô khái niệm còn lại, không bị thông báo lỗi và không kẹt.
- [ ] **Quan hệ nhiều-nhiều:** nối thêm một giải thích cho cùng một khái niệm →
      dây nối **cũ vẫn còn**, dây mới được thêm vào (không bị ghi đè).
- [ ] **Quan hệ nhiều-nhiều:** nối cùng một giải thích cho nhiều khái niệm →
      dây nối **cũ vẫn còn**, ô giải thích đó có nhiều dây cùng neo vào.
- [ ] Kéo từ nút **bên phải** sang nút bên trái cũng tạo thêm cặp nối.
- [ ] Nút bên trái hiện số giải thích đang nối; ô bên phải có huy hiệu số
      khái niệm đang nối.
- [ ] Bấm nút phải đang nối nhiều khái niệm → gỡ **hết** các cặp của nút đó.
- [ ] Chọn một khái niệm rồi bấm nút phải → bật/tắt đúng cặp nối giữa hai ô.
- [ ] Thử cửa sổ trình duyệt hẹp và rộng; hai cột vẫn ổn định, văn bản tự xuống
  dòng và đường nối bám theo điểm.
- [ ] Nộp câu trả lời và xác nhận dây đã nối đúng chuyển xanh, dây sai chuyển
      đỏ, mỗi cặp đúng còn thiếu được vẽ thêm dây vàng.
- [ ] Trước khi nộp không hiển thị dây đáp án còn thiếu; sau khi nộp các ô bị
      khóa và không thể thay đổi câu trả lời.

### Điền từ vào đoạn văn (Cloze)

- [ ] Mở Editor Cloze và xác nhận chỉ có một textarea nội dung dùng placeholder
      `{{N}}`, thay thế trường tên riêng và trường “Nội dung đoạn văn”; danh sách
      đáp án và nút thêm dòng cùng nằm trong nhóm “Tên / nội dung câu hỏi”.
- [ ] Lưu Editor, tạo bản runtime và xác nhận các mảng đáp án hợp lệ vẫn được
      giữ nguyên trong `blanks[].answers`.
- [ ] Xác nhận Player chỉ hiển thị đoạn văn một lần, không lặp lại nội dung
      placeholder ở tiêu đề câu hỏi.
- [ ] Chạy câu hỏi và nhập đáp án đúng có khoảng trắng đầu/cuối, chữ hoa/thường
      khác với đáp án cấu hình; xác nhận hệ thống vẫn chấm đúng.
- [ ] Nhập một đáp án trong mảng nhiều đáp án được chấp nhận; xác nhận ô chuyển
      xanh.
- [ ] Nộp câu trả lời sai hoặc bỏ trống một ô; xác nhận ô chuyển đỏ và hiện
      đáp án chuẩn màu vàng ngay cạnh ô.
- [ ] Với một đáp án hợp lệ, xác nhận gợi ý vàng hiển thị bằng chữ; với nhiều
      đáp án, xác nhận danh sách thả màu vàng liệt kê đủ đáp án.
- [ ] Để trống tất cả ô rồi nộp; xác nhận câu vẫn được nộp và mọi ô chuyển đỏ
      với gợi ý đáp án phù hợp.

### Chọn từ trong danh sách (Dropdown)

- [ ] Mở cấu hình và xác nhận textarea nội dung nằm trong nhóm “Tên / nội dung
      câu hỏi”, dùng `{{1}}`, `{{2}}`, ... để chèn các danh sách chọn.
- [ ] Xác nhận không còn trường đoạn văn riêng, danh sách từ dùng chung hoặc
      nút sao chép danh sách chung.
- [ ] Cấu hình lựa chọn và đáp án đúng riêng cho từng chỗ trống; thêm/xóa chỗ
      trống và xác nhận thứ tự placeholder khớp với cấu hình.
- [ ] Gõ thêm `{{N}}` vào nội dung câu hỏi; xác nhận Editor tự tạo nhóm lựa
      chọn cho placeholder mới.
- [ ] Lưu, mở lại và chạy Player; nội dung hiển thị đúng một lần, mỗi chỗ trống
      có danh sách riêng và sau khi nộp được khóa, phản hồi đúng/sai rõ ràng.

### Chọn vùng trên ảnh (Hotspot)

- [ ] Mở cấu hình Hotspot, đổi một vùng chữ nhật thành hình tròn rồi đổi lại;
      xác nhận hình dạng hiển thị và kích thước vẫn hợp lý trên ảnh ngang/dọc.
- [ ] Lưu cấu hình, mở lại và xác nhận `shape` cùng tọa độ/kích thước được giữ.
- [ ] Chạy câu hỏi, kéo vùng người chơi đến vị trí đáp án và nộp; xác nhận đáp
      án vàng, vùng người chơi đỏ và phần giao xanh hiển thị đồng thời.
- [ ] Đặt tên vùng có nhiều từ trong Editor; xác nhận tên hiển thị trên vùng
      kéo thả của Player trùng chính xác với tên đã lưu.
- [ ] Thử vùng tròn–tròn, chữ nhật–chữ nhật và tròn–chữ nhật; xác nhận phần
      giao theo đúng đường biên, không tô xanh toàn bộ hộp bao của hình tròn.
- [ ] Thử vùng trùng hoàn toàn, giao một phần và không giao; xác nhận ngưỡng
      giao vẫn quyết định kết quả chấm, còn lớp màu thể hiện hình học giao thật.

### Matching trong trình chỉnh sửa (Editor)

- [ ] Giao diện **KHÔNG đổi** so với bản trước: mỗi khái niệm có N cúc tròn
      **+ 1 cúc "+"** để thêm giải thích mới (không phải kiểu "1 nút/ô" của
      Player View).
- [ ] Tạo cặp nối ô, **đóng** bảng cấu hình rồi **mở lại lần thứ hai**: các
      đường nối cũ vẫn hiển thị đúng vị trí, bám sát mép cúc tròn (không bị lệch
      khi modal đang chạy animation mở cửa).
- [ ] Sửa lại nội dung khái niệm / giải thích: đường nối vẫn bám đúng sau khi
      gõ.
- [ ] Thêm / xoá khái niệm và giải thích: đường nối được vẽ lại tương ứng.
- [ ] Bấm lại cúc tròn đã nối để tách cặp; lưu cấu hình rồi mở lại vẫn giữ
      đúng số cặp đã nối.

### Trắc nghiệm

- [ ] Tạo câu hỏi trắc nghiệm và xác nhận công tắc xáo trộn mặc định tắt.
- [ ] Bật xáo trộn, lưu rồi mở lại cấu hình; xác nhận trạng thái được giữ.
- [ ] Chạy câu hỏi với xáo trộn bật và tắt; kiểm tra thứ tự lựa chọn thay đổi
  khi bật và giữ nguyên thứ tự gốc khi tắt.
- [ ] Kiểm tra chấm đúng ở cả chế độ chọn một và chọn nhiều sau khi xáo trộn.
- [ ] Xác nhận cấu hình và màn hình chơi không hiển thị số lượng đáp án đúng.
- [ ] Nộp câu trả lời và xác nhận chỉ viền chuyển xanh/đỏ, nền không đổi.

### Câu hỏi sắp xếp

- [ ] Kéo một hàng lên/xuống; hàng nổi bóng đổ, bám con trỏ theo chiều dọc và
  một khe giữ chỗ xuất hiện tại vị trí ban đầu.
- [ ] Kéo qua tâm các hàng khác; khe đích đổi vị trí tức thời và các hàng bị
  đi qua trượt mượt để nhường chỗ.
- [ ] Khi bắt đầu kéo, xác nhận ô không nhảy khỏi vị trí/con trỏ ban đầu.
- [ ] Thả hàng; hàng snap vào khe đích, thứ tự được cập nhật và đánh số lại.
- [ ] Nộp thứ tự đúng; tất cả hàng có nền/viền xanh và bounce nhẹ.
- [ ] Nộp thứ tự sai; cả danh sách chuyển đỏ và lắc trước khi Bubble Sort hiển
  thị thứ tự đúng, sau đó chuyển xanh.
- [ ] Bật cài đặt giảm chuyển động của hệ điều hành và xác nhận animation được
  rút ngắn.

### Hồi quy cơ bản

- [ ] Mở modal bằng nút bánh răng và lưu cấu hình.
- [ ] Bắt đầu, dừng và quay lại Builder.
- [ ] Lưu dự án, tải lại dự án đã lưu và xác nhận dữ liệu câu hỏi còn nguyên.
