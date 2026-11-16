/* ============================================================================
 *  MODULE: js/mobile/mobile-list.js — DANH SÁCH CÂU HỎI & BOTTOM SHEET (bản 2.8)
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - setupMobileQuestionList()   : gắn sự kiện cho vùng danh sách câu hỏi.
 *    - renderMobileQuestionList()  : dựng lại danh sách câu hỏi (dọc).
 *    - openMobileAddQuestionSheet(): mở Bottom Sheet chọn 6 loại câu hỏi.
 *    - createMobileQuestion()      : tạo khối câu hỏi mới (trước/sau khối đang chọn).
 *    - duplicateMobileQuestion()   : nhân bản một câu hỏi.
 *    - moveMobileQuestion()        : đổi thứ tự câu hỏi (lên/xuống).
 *    - openMobileSheet()/closeMobileSheet() : Bottom Sheet dùng chung.
 *
 *  NGUYÊN TẮC DÙNG CHUNG DỮ LIỆU (rất quan trọng):
 *    - Danh sách mobile đọc trực tiếp từ mảng `blocks[]` — cùng mảng mà PC
 *      dùng. Không có bản sao, không có bộ nhớ riêng.
 *    - Mọi thao tác thêm/sửa/xoá/nhân bản/đổi thứ tự đều thao tác trên `blocks[]`
 *      ⇒ PC và điện thoại luôn thấy cùng dữ liệu.
 *    - Sau mỗi thay đổi ⇒ gọi notifyBlocksChanged() để CẢ HAI giao diện
 *      cập nhật, rồi scheduleAutoSave().
 *
 *  VỀ MÀU SẮC NHẬN DIỆN:
 *    Dùng lại đúng bảng màu của PC (nằm trong css/blocks.css):
 *      multiple-choice #4c97ff · ordering #ffab19 · matching #9966ff
 *      hotspot #ff6680 · cloze #cf63cf · dropdown #ff7b8b
 * ========================================================================== */


/* ------------------------------------------------------------
 *  BẢNG MÀU NHẬN DIỆN THEO LOẠI CÂU HỎI (giống hệt PC)
 * ------------------------------------------------------------ */
var MOBILE_TYPE_COLORS = {
    'multiple-choice': '#4c97ff',
    'ordering': '#ffab19',
    'matching': '#9966ff',
    'hotspot': '#ff6680',
    'cloze': '#cf63cf',
    'dropdown': '#ff7b8b'
};

/** Khối câu hỏi đang được chọn trên mobile (dùng để thêm trước/sau) */
var mobileSelectedBlockId = null;

/** Vị trí chèn đang chọn trong Bottom Sheet thêm câu hỏi */
var mobilePendingPosition = 'end';

/**
 * Bộ đếm thời gian của thao tác "tự mở trang cấu hình sau khi thêm câu hỏi".
 * Cần để huỷ được: nếu người dùng đóng lớp phủ trước khi bộ đếm chạy thì
 * KHÔNG được mở trang cấu hình trở lại.
 */
var mobileAutoOpenTimer = null;

/** Tham chiếu phần tử Bottom Sheet (dùng chung cho mọi sheet) */
var MobileSheet = {
    root: null,     // lớp phủ nền tối
    panel: null,    // bảng trượt lên từ dưới
    title: null,    // tiêu đề sheet
    body: null,     // nội dung sheet
    onClose: null   // hàm gọi khi đóng
};

/* ------------------------------------------------------------
 *  BOTTOM SHEET (bảng trượt từ dưới lên) — dùng chung
 * ------------------------------------------------------------ */

/**
 * Mở một Bottom Sheet.
 * @param {Object} opts - tuỳ chọn: { title, content (HTMLElement), onClose }
 */
function openMobileSheet(opts) {
    opts = opts || {};
    if (!MobileSheet.root) {
        var root = htmlToElement(
            '<div class="mobile-sheet-overlay" hidden>'
            + '  <div class="mobile-sheet" role="dialog" aria-modal="true">'
            + '    <div class="mobile-sheet-handle" aria-hidden="true"></div>'
            + '    <header class="mobile-sheet-header">'
            + '      <h3 class="mobile-sheet-title"></h3>'
            + '      <button type="button" class="mobile-sheet-close"'
            + '              data-mobile-sheet-close aria-label="Đóng">×</button>'
            + '    </header>'
            + '    <div class="mobile-sheet-body"></div>'
            + '  </div>'
            + '</div>'
        );
        document.body.appendChild(root);
        MobileSheet.root = root;
        MobileSheet.panel = root.querySelector('.mobile-sheet');
        MobileSheet.title = root.querySelector('.mobile-sheet-title');
        MobileSheet.body = root.querySelector('.mobile-sheet-body');

        // Bấm ra ngoài hoặc bấm nút đóng ⇒ đóng sheet
        root.addEventListener('click', function (e) {
            if (e.target === root || e.target.closest('[data-mobile-sheet-close]')) {
                closeMobileSheet();
            }
        });

        // Gắn sự kiện chung của sheet (chọn loại câu hỏi / vị trí chèn).
        // PHẢI gắn ngay khi tạo root ⇒ vì root chỉ được tạo ở lần mở sheet
        // đầu tiên, mà init() chạy trước đó.
        setupMobileSheetEvents();
    }

    MobileSheet.title.textContent = opts.title || '';
    MobileSheet.body.innerHTML = '';
    if (opts.content) MobileSheet.body.appendChild(opts.content);
    MobileSheet.onClose = opts.onClose || null;

    MobileSheet.root.hidden = false;
    // Ép trình duyệt vẽ lại khung hình để kích hoạt hiệu ứng trượt lên
    void MobileSheet.root.offsetWidth;
    MobileSheet.root.classList.add('is-open');
    document.body.classList.add('mobile-sheet-open');
}

/**
 * Đóng Bottom Sheet đang mở.
 */
function closeMobileSheet() {
    if (!MobileSheet.root || MobileSheet.root.hidden) return;
    MobileSheet.root.classList.remove('is-open');
    document.body.classList.remove('mobile-sheet-open');

    var onClose = MobileSheet.onClose;
    MobileSheet.onClose = null;

    // Chờ hiệu ứng trượt xong rồi mới ẩn hẳn
    setTimeout(function () {
        if (MobileSheet.root && !MobileSheet.root.classList.contains('is-open')) {
            MobileSheet.root.hidden = true;
            MobileSheet.body.innerHTML = '';
        }
    }, 240);

    if (typeof onClose === 'function') onClose();
}

/**
 * Đóng tất cả các Bottom Sheet đang mở (dùng khi rời chế độ mobile).
 */
function closeMobileSheets() {
    if (MobileSheet.root && !MobileSheet.root.hidden) {
        MobileSheet.root.hidden = true;
        MobileSheet.root.classList.remove('is-open');
        MobileSheet.body.innerHTML = '';
        MobileSheet.onClose = null;
    }
    document.body.classList.remove('mobile-sheet-open');
    // Trả lại vị trí chèn về mặc định ⇒ lần mở sheet sau không bị "nhớ" nhầm
    mobilePendingPosition = 'end';
    // Huỷ thao tác tự mở trang cấu hình đang chờ (nếu có)
    if (typeof cancelMobileAutoOpen === 'function') cancelMobileAutoOpen();
}


/* ------------------------------------------------------------
 *  TÓM TẮT THÔNG TIN MỘT CÂU HỎI (dùng cho thẻ trong danh sách)
 * ------------------------------------------------------------ */

/**
 * Tạo phần tóm tắt ngắn gọn về đáp án của một câu hỏi.
 * @param {Object} block - khối câu hỏi
 * @returns {string} chuỗi mô tả
 */
function mobileQuestionSummary(block) {
    const d = block.data;
    const t = block.type;
    if (t === 'multiple-choice' || t === 'multi-answer') {
        const total = (d.options || []).length;
        const correct = (d.options || []).filter(function (o) { return o.correct; }).length;
        return total + ' đáp án · ' + correct + ' đúng';
    }
    if (t === 'ordering') {
        return (d.items || []).length + ' phần tử cần sắp xếp';
    }
    if (t === 'matching') {
        const pairs = d.pairs || [];
        let n = 0;
        pairs.forEach(function (p) { n += (p.explanations || []).length; });
        return pairs.length + ' khái niệm · ' + n + ' cặp nối';
    }
    if (t === 'hotspot') {
        return (d.regions || []).length + ' vùng chọn trên ảnh';
    }
    if (t === 'cloze') {
        return (d.blanks || []).length + ' chỗ trống cần điền';
    }
    if (t === 'dropdown') {
        return (d.answers || []).length + ' chỗ trống · '
            + (d.options || []).length + ' lựa chọn';
    }
    return '';
}

/**
 * Kiểm tra một câu hỏi có chương trình khối lệnh hay không.
 * @param {Object} block - khối câu hỏi
 * @returns {boolean} true nếu có ít nhất một chồng lệnh
 */
function mobileHasProgram(block) {
    const p = block.data && block.data.program;
    if (!p || !p.stacks) return false;
    return !!(p.stacks.setup.length || p.stacks.correct.length || p.stacks.wrong.length);
}

/* ------------------------------------------------------------
 *  THAO TÁC TRÊN CÂU HỎI (dùng chung dữ liệu với PC)
 * ------------------------------------------------------------ */

/**
 * Báo cho cả hai giao diện (PC + mobile) biết dữ liệu đã thay đổi.
 * Gọi sau mỗi thao tác thêm/xoá/nhân bản/đổi thứ tự.
 */
function notifyBlocksChanged() {
    // Cập nhật vùng làm việc PC + danh sách câu hỏi PC
    if (typeof refreshStageAndProperties === 'function') refreshStageAndProperties();
    if (typeof renderQuestionList === 'function') renderQuestionList();
    // Cập nhật danh sách mobile
    if (typeof renderMobileQuestionList === 'function') renderMobileQuestionList();
    // Tự động lưu
    if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
}

/**
 * Tìm chỉ số của một khối trong mảng `blocks[]`.
 * @param {Object} block - khối cần tìm
 * @returns {number} chỉ số, hoặc -1 nếu không tìm thấy
 */
function mobileBlockIndex(block) {
    return blocks.indexOf(block);
}

/**
 * Tạo một câu hỏi mới.
 *
 * @param {string} type - loại câu hỏi (key của BLOCK_TYPES)
 * @param {string} position - 'before' | 'after' | 'end' (vị trí so với khối đang chọn)
 * @returns {Object} khối câu hỏi vừa tạo
 */
function createMobileQuestion(type, position) {
    const meta = BLOCK_TYPES[type];
    if (!meta) return null;

    // Tạo dữ liệu mặc định của loại câu hỏi (dùng chung BLOCK_TYPES)
    const data = meta.create();

    // Tạo id riêng cho câu hỏi (dùng bộ đếm chung của ứng dụng)
    const id = nextBlockId();

    const block = {
        id: id,
        type: type,
        x: 40,
        y: 40,
        data: data
    };

    // Tính vị trí chèn
    let insertAt = blocks.length;
    if (position === 'before' || position === 'after') {
        const selected = blocks.find(function (b) { return b.id === mobileSelectedBlockId; });
        if (selected) {
            const idx = mobileBlockIndex(selected);
            insertAt = (position === 'before') ? idx : idx + 1;
        }
    }

    blocks.splice(insertAt, 0, block);

    // Đồng bộ thứ tự trong workspace PC
    if (typeof sortBlocksByPosition === 'function') sortBlocksByPosition();
    if (typeof refreshStageAndProperties === 'function') refreshStageAndProperties();

    // Chọn khối mới làm đối tượng thao tác
    mobileSelectedBlockId = id;

    notifyBlocksChanged();

    return block;
}

/**
 * Nhân bản một câu hỏi (sao chép sâu toàn bộ dữ liệu, kể cả chương trình khối).
 * @param {Object} block - khối nguồn
 * @returns {Object} khối mới tạo
 */
function duplicateMobileQuestion(block) {
    if (!block) return null;

    const meta = BLOCK_TYPES[block.type];
    if (!meta) return null;

    // Bắt đầu từ dữ liệu mặc định rồi ghi đè bằng dữ liệu đã sao chép
    const data = meta.create();
    Object.keys(block.data).forEach(function (key) {
        data[key] = deepClone(block.data[key]);
    });

    const copy = {
        id: nextBlockId(),
        type: block.type,
        x: block.x + 30,
        y: block.y + 30,
        data: data
    };

    // Chèn ngay sau khối gốc
    const idx = mobileBlockIndex(block);
    blocks.splice(idx + 1, 0, copy);
    mobileSelectedBlockId = copy.id;

    notifyBlocksChanged();

    showToast('📋 Đã nhân bản câu hỏi.');

    return copy;
}

/**
 * Đổi thứ tự của một câu hỏi trong danh sách.
 * @param {Object} block - khối cần di chuyển
 * @param {number} delta - -1 (lên) hoặc +1 (xuống)
 * @returns {boolean} true nếu đã di chuyển
 */
function moveMobileQuestion(block, delta) {
    if (!block) return false;
    const idx = mobileBlockIndex(block);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= blocks.length) return false;

    blocks.splice(idx, 1);
    blocks.splice(target, 0, block);

    // Cập nhật toạ độ Y để khớp với thứ tự mới (workspace PC xếp theo Y)
    blocks.forEach(function (b, i) { b.y = 40 + i * 120; });
    if (typeof sortBlocksByPosition === 'function') sortBlocksByPosition();

    notifyBlocksChanged();
    return true;
}

/**
 * Xoá một câu hỏi khỏi danh sách và khỏi vùng làm việc.
 * @param {Object} block - khối câu hỏi cần xoá
 */
function deleteMobileQuestion(block) {
    if (!block) return;
    if (typeof removeBlock === 'function') {
        removeBlock(block);          // hàm dùng chung của PC (xoá khỏi blocks[] và DOM)
    } else {
        const idx = mobileBlockIndex(block);
        if (idx !== -1) blocks.splice(idx, 1);
    }
    if (mobileSelectedBlockId === block.id) mobileSelectedBlockId = null;
    notifyBlocksChanged();
    showToast('🗑️ Đã xoá câu hỏi.');
}

/* ------------------------------------------------------------
 *  DỰNG DANH SÁCH CÂU HỎI DỌC
 * ------------------------------------------------------------ */

/**
 * Dựng lại danh sách câu hỏi trong vùng thiết kế của mobile.
 * Đọc trực tiếp từ mảng `blocks[]` (dùng chung dữ liệu với PC).
 */
function renderMobileQuestionList() {
    const pane = MobileDOM.designPane;
    if (!pane) return;

    // Chỉ dựng lại khi đang ở chế độ mobile để không tốn công trên PC
    if (!isMobileView()) return;

    // Giữ nguyên phần tử đầu (tiêu đề + phần trợ giúp) nếu đã có
    let list = pane.querySelector('.mobile-question-list');
    if (!list) {
        pane.innerHTML = '';
        // LƯU Ý: `htmlToElement()` chỉ trả về phần tử ĐẦU TIÊN ⇒ phải bọc
        // trong một vùng cha duy nhất, nếu không các phần tử anh em sẽ bị mất.
        const wrap = htmlToElement(
            '<div class="mobile-list-wrap">'
            + '  <div class="mobile-list-header">'
            + '    <h2 class="mobile-list-title">Câu hỏi</h2>'
            + '    <span class="mobile-list-count" data-mobile-count></span>'
            + '  </div>'
            + '  <div class="mobile-list-empty" data-mobile-empty hidden>'
            + '    <div class="mobile-empty-icon">📝</div>'
            + '    <p>Chưa có câu hỏi nào.</p>'
            + '    <p class="mobile-empty-hint">Bấm nút ＋ ở góc dưới để thêm câu hỏi đầu tiên.</p>'
            + '  </div>'
            + '  <div class="mobile-question-list"></div>'
            + '</div>'
        );
        pane.appendChild(wrap);
        list = pane.querySelector('.mobile-question-list');
    }

    if (!list) return;
    list.innerHTML = '';

    const countEl = pane.querySelector('[data-mobile-count]');
    const emptyEl = pane.querySelector('[data-mobile-empty]');

    if (countEl) countEl.textContent = blocks.length + ' câu hỏi';
    if (emptyEl) emptyEl.hidden = blocks.length > 0;

    blocks.forEach(function (block, index) {
        const meta = BLOCK_TYPES[block.type] || { icon: '❓', label: block.type };
        const color = MOBILE_TYPE_COLORS[block.type] || '#4c97ff';

        const card = htmlToElement(
            '<article class="mobile-q-card" data-block-id="' + block.id + '"'
            + ' style="--type-color:' + color + '">'
            + '  <div class="mobile-q-index">' + (index + 1) + '</div>'
            + '  <div class="mobile-q-main">'
            + '    <div class="mobile-q-type">' + meta.icon + ' ' + escapeHtml(meta.label) + '</div>'
            + '    <h3 class="mobile-q-text"></h3>'
            + '    <div class="mobile-q-summary"></div>'
            + '    <div class="mobile-q-meta">'
            + '      <span class="mobile-chip">⭐ ' + escapeHtml(block.data.score) + ' điểm</span>'
            + '      <span class="mobile-chip">⏱️ ' + escapeHtml(block.data.timeLimit) + 's</span>'
            + '      <span class="mobile-chip mobile-chip-soft"></span>'
            + '    </div>'
            + '  </div>'
            + '  <div class="mobile-q-actions">'
            + '    <button type="button" class="mobile-q-edit" data-action="edit"'
            + '            title="Chỉnh sửa" aria-label="Chỉnh sửa">✏️</button>'
            + '    <button type="button" class="mobile-q-more" data-action="more"'
            + '            title="Thao tác khác" aria-label="Thao tác khác">⋯</button>'
            + '  </div>'
            + '</article>'
        );

        // Nội dung câu hỏi (gán bằng textContent ⇒ tự escape an toàn)
        const textEl = card.querySelector('.mobile-q-text');
        const raw = block.data.question || block.data.paragraph || '';
        textEl.textContent = raw || 'Chưa có nội dung câu hỏi';

        // Tóm tắt đáp án
        const sumEl = card.querySelector('.mobile-q-summary');
        const summary = mobileQuestionSummary(block);
        sumEl.textContent = summary;
        sumEl.hidden = !summary;

        // Huy hiệu chương trình khối lệnh
        const chipSoft = card.querySelector('.mobile-chip-soft');
        const hasProgram = mobileHasProgram(block);
        chipSoft.textContent = hasProgram ? '🧩 Có lập trình khối' : '';
        chipSoft.hidden = !hasProgram;

        // Đánh dấu khối đang chọn
        if (block.id === mobileSelectedBlockId) {
            card.classList.add('is-selected');
        }

        list.appendChild(card);
    });
}

/* ------------------------------------------------------------
 *  BOTTOM SHEET THÊM CÂU HỎI
 * ------------------------------------------------------------ */

/**
 * Mở Bottom Sheet chọn loại câu hỏi mới.
 *
 * Nếu đang có một câu hỏi được chọn ⇒ cho phép chọn chèn TRƯỚC hoặc SAU
 * câu hỏi đó. Nếu không có ⇒ câu hỏi mới thêm vào CUỐI danh sách.
 */
function openMobileAddQuestionSheet() {
    const selected = blocks.find(function (b) { return b.id === mobileSelectedBlockId; });

    const content = htmlToElement('<div></div>');

    // Nhóm "vị trí chèn" — chỉ hiện khi đang có câu hỏi được chọn
    if (selected) {
        const index = mobileBlockIndex(selected) + 1;
        const posGroup = htmlToElement(
            '<div class="mobile-sheet-group">'
            + '  <div class="mobile-sheet-group-title">Chèn vị trí</div>'
            + '  <div class="mobile-pos-group">'
            + '    <button type="button" class="mobile-pos-btn" data-position="before">'
            + '      ⬆ Chèn trước câu ' + index
            + '    </button>'
            + '    <button type="button" class="mobile-pos-btn" data-position="after">'
            + '      ⬇ Chèn sau câu ' + index
            + '    </button>'
            + '  </div>'
            + '</div>'
        );
        content.appendChild(posGroup);
    }

    // Lưới 6 loại câu hỏi — dùng đúng nhãn + màu của PC
    const grid = htmlToElement('<div class="mobile-type-grid"></div>');
    Object.keys(BLOCK_TYPES).forEach(function (type) {
        const meta = BLOCK_TYPES[type];
        if (meta.hidden) return;
        const color = MOBILE_TYPE_COLORS[type] || '#4c97ff';
        const btn = htmlToElement(
            '<button type="button" class="mobile-type-btn" data-type="' + type + '"'
            + ' style="--type-color:' + color + '">'
            + '  <span class="mobile-type-icon">' + meta.icon + '</span>'
            + '  <span class="mobile-type-label">' + escapeHtml(meta.label) + '</span>'
            + '</button>'
        );
        grid.appendChild(btn);
    });
    content.appendChild(grid);

    // Đánh dấu vị trí chèn đang chọn (nếu có)
    if (selected) {
        const active = content.querySelector('.mobile-pos-btn[data-position="' + mobilePendingPosition + '"]');
        if (active) active.classList.add('is-active');
    }

    openMobileSheet({
        title: 'Thêm câu hỏi mới',
        content: content
    });
}

/**
 * Xử lý khi người dùng chọn một loại câu hỏi trong Bottom Sheet.
 * @param {string} type - loại câu hỏi
 * @param {string} position - 'before' | 'after' | 'end'
 */
function handleMobileAddQuestion(type, position) {
    const block = createMobileQuestion(type, position || 'end');
    closeMobileSheet();
    mobilePendingPosition = 'end';
    if (!block) return;

    showToast('✅ Đã thêm câu hỏi mới.');

    // Tự động mở màn hình cấu hình cho câu hỏi vừa tạo (sau khi sheet đóng).
    // PHẢI kiểm tra câu hỏi vẫn còn trong `blocks[]` — nếu người dùng đã xoá
    // nó trong lúc chờ thì không được mở trang cấu hình của một khối không còn.
    if (mobileAutoOpenTimer) clearTimeout(mobileAutoOpenTimer);
    mobileAutoOpenTimer = setTimeout(function () {
        mobileAutoOpenTimer = null;
        if (blocks.indexOf(block) === -1) return;
        if (typeof openMobileEditor === 'function') openMobileEditor(block);
    }, 260);
}

/**
 * Huỷ thao tác tự động mở trang cấu hình (dùng khi đóng lớp phủ hoặc rời
 * chế độ điện thoại).
 */
function cancelMobileAutoOpen() {
    if (mobileAutoOpenTimer) {
        clearTimeout(mobileAutoOpenTimer);
        mobileAutoOpenTimer = null;
    }
}

/* ------------------------------------------------------------
 *  MENU THAO TÁC CỦA MỘT CÂU HỎI
 * ------------------------------------------------------------ */

/**
 * Mở Bottom Sheet các thao tác của một câu hỏi.
 * @param {Object} block - khối câu hỏi
 */
function openMobileQuestionMenu(block) {
    if (!block) return;
    const index = mobileBlockIndex(block) + 1;
    const meta = BLOCK_TYPES[block.type] || { icon: '❓', label: block.type };

    const content = htmlToElement(
        '<div class="mobile-menu-list">'
        + '  <div class="mobile-menu-info">' + meta.icon + ' Câu ' + index + ' · '
        + escapeHtml(meta.label) + '</div>'
        + '  <button type="button" class="mobile-action-btn" data-qaction="edit">'
        + '    ✏️ Chỉnh sửa câu hỏi</button>'
        + '  <button type="button" class="mobile-action-btn" data-qaction="duplicate">'
        + '    📋 Nhân bản câu hỏi</button>'
        + '  <button type="button" class="mobile-action-btn" data-qaction="move-up">'
        + '    ⬆️ Đưa lên trên</button>'
        + '  <button type="button" class="mobile-action-btn" data-qaction="move-down">'
        + '    ⬇️ Đưa xuống dưới</button>'
        + '  <button type="button" class="mobile-action-btn" data-qaction="preview">'
        + '    👁️ Xem trước câu hỏi này</button>'
        + '  <button type="button" class="mobile-action-btn mobile-action-danger" data-qaction="delete">'
        + '    🗑️ Xoá câu hỏi</button>'
        + '</div>'
    );

    openMobileSheet({ title: 'Thao tác', content: content });

    // Gắn sự kiện cho các nút trong sheet
    content.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-qaction]');
        if (!btn) return;
        const action = btn.dataset.qaction;

        if (action === 'edit') {
            closeMobileSheet();
            setTimeout(function () {
                if (typeof openMobileEditor === 'function') openMobileEditor(block);
            }, 240);
        } else if (action === 'duplicate') {
            closeMobileSheet();
            duplicateMobileQuestion(block);
        } else if (action === 'move-up') {
            closeMobileSheet();
            moveMobileQuestion(block, -1);
        } else if (action === 'move-down') {
            closeMobileSheet();
            moveMobileQuestion(block, 1);
        } else if (action === 'preview') {
            closeMobileSheet();
            if (typeof previewSingleMobileQuestion === 'function') {
                previewSingleMobileQuestion(block);
            }
        } else if (action === 'delete') {
            closeMobileSheet();
            // Xác nhận trước khi xoá (tránh xoá nhầm trên điện thoại)
            if (window.confirm('Xoá câu hỏi này?')) {
                deleteMobileQuestion(block);
            }
        }
    });
}

/* ------------------------------------------------------------
 *  GẮN SỰ KIỆN CHO DANH SÁCH CÂU HỎI
 * ------------------------------------------------------------ */

/**
 * Gắn sự kiện cho vùng danh sách câu hỏi của mobile (chỉ gắn một lần).
 */
function setupMobileQuestionList() {
    const pane = MobileDOM.designPane;
    if (!pane || pane.dataset.listReady === '1') return;
    pane.dataset.listReady = '1';

    pane.addEventListener('click', function (e) {
        /* --- Bấm vào thẻ câu hỏi: chọn làm đối tượng thao tác --- */
        const card = e.target.closest('.mobile-q-card');
        if (!card) return;

        const block = blocks.find(function (b) { return b.id === card.dataset.blockId; });
        if (!block) return;

        // Nút chỉnh sửa
        if (e.target.closest('[data-action="edit"]')) {
            mobileSelectedBlockId = block.id;
            renderMobileQuestionList();
            if (typeof openMobileEditor === 'function') openMobileEditor(block);
            return;
        }

        // Nút "thao tác khác"
        if (e.target.closest('[data-action="more"]')) {
            mobileSelectedBlockId = block.id;
            renderMobileQuestionList();
            openMobileQuestionMenu(block);
            return;
        }

        // Chọn khối (bấm vào phần thân thẻ)
        mobileSelectedBlockId = block.id;
        renderMobileQuestionList();
    });
}

/**
 * Gắn sự kiện cho Bottom Sheet (dùng chung cho mọi sheet).
 *
 * Được gọi từ `openMobileSheet()` ngay khi tạo lớp phủ sheet, và có thể gọi
 * lại từ `init()` — hàm tự kiểm tra cờ `dataset.ready` để không gắn trùng.
 */
function setupMobileSheetEvents() {
    if (!MobileSheet.root) return;
    if (MobileSheet.root.dataset.ready === '1') return;
    MobileSheet.root.dataset.ready = '1';

    MobileSheet.root.addEventListener('click', function (e) {
        /* --- Chọn loại câu hỏi trong lưới --- */
        const typeBtn = e.target.closest('.mobile-type-btn');
        if (typeBtn) {
            handleMobileAddQuestion(typeBtn.dataset.type, mobilePendingPosition);
            return;
        }

        /* --- Chọn vị trí chèn (trước/sau) --- */
        const posBtn = e.target.closest('.mobile-pos-btn');
        if (posBtn) {
            // Ghi nhớ vị trí đã chọn ⇒ vòng lặp lại sẽ thêm vào vị trí này
            mobilePendingPosition = posBtn.dataset.position;
            MobileSheet.body.querySelectorAll('.mobile-pos-btn').forEach(function (b) {
                b.classList.toggle('is-active', b === posBtn);
            });
            return;
        }
    });
}
