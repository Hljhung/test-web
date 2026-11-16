/* ============================================================================
 *  MODULE: js/mobile/mobile-editor.js — MÀN HÌNH CẤU HÌNH TRÊN ĐIỆN THOẠI (bản 2.8)
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - openMobileEditor(block)  : mở trang cấu hình toàn màn hình.
 *    - closeMobileEditor()      : đóng trang cấu hình (lưu hoặc huỷ).
 *    - setupMobileEditor()      : gắn sự kiện cho trang cấu hình.
 *
 *  NGUYÊN TẮC "KHÔNG MẤT CHỨC NĂNG":
 *    Trang cấu hình mobile KHÔNG viết lại logic cấu hình mới. Nó dựng lại
 *    CHÍNH form của PC qua `renderEditorFormInto()` rồi bọc các khối form vào
 *    các NHÓM THU GỌN. Nhờ vậy:
 *      - Mọi chức năng cấu hình sẵn có (đáp án, xáo trộn, ảnh, hotspot, cloze,
 *        dropdown, matching, chương trình khối...) đều hoạt động y như PC.
 *      - Dữ liệu vẫn nằm trong `block.data` ⇒ tương thích hoàn toàn.
 *
 *  CÁC NHÓM THU GỌN:
 *    1. Nội dung câu hỏi    4. Hình ảnh
 *    2. Đáp án              5. Ghi chú và hướng dẫn
 *    3. Điểm và thời gian   6. Cài đặt nâng cao
 *
 *  LƯU Ý VỀ BÀN PHÍM ẢO:
 *    Thanh chân (Hủy bỏ / Lưu cấu hình) dính đáy màn hình và có
 *    `padding-bottom: env(safe-area-inset-bottom)` ⇒ không bị bàn phím che.
 *    Các ô nhập dùng cỡ chữ 16px ⇒ iOS không tự phóng to.
 * ========================================================================== */


/* ------------------------------------------------------------
 *  TRẠNG THÁI
 * ------------------------------------------------------------ */

/** Khối câu hỏi đang được cấu hình trên mobile */
var mobileEditingBlock = null;

/** Tham chiếu tới các phần tử của trang cấu hình mobile */
var MobileEditorDOM = {
    root: null,       // lớp phủ toàn màn hình
    header: null,     // thanh tiêu đề
    title: null,      // tiêu đề
    tabs: null,       // thanh tab (Cấu hình / Lập trình khối)
    body: null,       // vùng nội dung
    formPane: null,   // vùng của tab Cấu hình
    codePane: null,   // vùng của tab Lập trình khối
    footer: null,     // thanh chân (Hủy bỏ / Lưu)
    saveBtn: null,    // nút Lưu cấu hình
    cancelBtn: null   // nút Hủy bỏ
};

/** Trạng thái tab hiện tại của trang cấu hình: 'config' | 'code' */
var mobileEditorTab = 'config';

/* ------------------------------------------------------------
 *  KHUNG TRANG CẤU HÌNH
 * ------------------------------------------------------------ */

/**
 * Dựng khung trang cấu hình mobile (chỉ một lần).
 */
function buildMobileEditorShell() {
    if (MobileEditorDOM.root) return;

    const root = htmlToElement(
        '<div class="mobile-editor" hidden>'
        + '  <header class="mobile-editor-header">'
        + '    <button type="button" class="mobile-editor-back" data-mob-edit="back"'
        + '            aria-label="Quay lại">‹</button>'
        + '    <h2 class="mobile-editor-title">Cấu hình câu hỏi</h2>'
        + '  </header>'
        + '  <nav class="mobile-editor-tabs" role="tablist">'
        + '    <button type="button" class="mobile-editor-tab is-active" data-mob-tab="config"'
        + '            role="tab" aria-selected="true">📋 Cấu hình</button>'
        + '    <button type="button" class="mobile-editor-tab" data-mob-tab="code"'
        + '            role="tab" aria-selected="false">🧩 Lập trình khối</button>'
        + '  </nav>'
        + '  <div class="mobile-editor-body">'
        + '    <div class="mobile-editor-pane mobile-editor-config"></div>'
        + '    <div class="mobile-editor-pane mobile-editor-code" hidden></div>'
        + '  </div>'
        + '  <footer class="mobile-editor-footer">'
        + '    <button type="button" class="btn btn-ghost mobile-editor-cancel"'
        + '            data-mob-edit="cancel">Hủy bỏ</button>'
        + '    <button type="button" class="btn btn-primary mobile-editor-save"'
        + '            data-mob-edit="save">Lưu cấu hình</button>'
        + '  </footer>'
        + '</div>'
    );
    document.body.appendChild(root);

    MobileEditorDOM.root = root;
    MobileEditorDOM.header = root.querySelector('.mobile-editor-header');
    MobileEditorDOM.title = root.querySelector('.mobile-editor-title');
    MobileEditorDOM.tabs = root.querySelector('.mobile-editor-tabs');
    MobileEditorDOM.body = root.querySelector('.mobile-editor-body');
    MobileEditorDOM.formPane = root.querySelector('.mobile-editor-config');
    MobileEditorDOM.codePane = root.querySelector('.mobile-editor-code');
    MobileEditorDOM.footer = root.querySelector('.mobile-editor-footer');
    MobileEditorDOM.saveBtn = root.querySelector('.mobile-editor-save');
    MobileEditorDOM.cancelBtn = root.querySelector('.mobile-editor-cancel');
}

/* ------------------------------------------------------------
 *  NHÓM THU GỌN (ACCORDION)
 * ------------------------------------------------------------ */

/**
 * Tạo một nhóm thu gọn trong trang cấu hình mobile.
 * @param {string} title - tiêu đề nhóm
 * @param {HTMLElement} content - nội dung của nhóm
 * @param {boolean} [open] - nhóm có mở sẵn hay không
 * @returns {HTMLElement} phần tử nhóm
 */
function mobileFormGroup(title, content, open) {
    const group = htmlToElement(
        '<section class="mobile-form-group' + (open ? ' is-open' : '') + '">'
        + '  <button type="button" class="mobile-group-head" aria-expanded="'
        + (open ? 'true' : 'false') + '">'
        + '    <span class="mobile-group-title">' + escapeHtml(title) + '</span>'
        + '    <span class="mobile-group-caret" aria-hidden="true">▾</span>'
        + '  </button>'
        + '  <div class="mobile-group-body"></div>'
        + '</section>'
    );
    const body = group.querySelector('.mobile-group-body');
    if (content) body.appendChild(content);

    // Bấm vào tiêu đề ⇒ mở / thu gọn
    group.querySelector('.mobile-group-head').addEventListener('click', function () {
        const isOpen = group.classList.toggle('is-open');
        group.querySelector('.mobile-group-head').setAttribute('aria-expanded',
            isOpen ? 'true' : 'false');
    });

    return group;
}

/* ------------------------------------------------------------
 *  DỰNG FORM CẤU HÌNH THEO NHÓM THU GỌN
 * ------------------------------------------------------------ */

/**
 * Dựng form cấu hình của mobile theo các NHÓM THU GỌN.
 *
 * Bước 1: dựng form gốc bằng `renderEditorFormInto()` — HÀM DÙNG CHUNG của PC.
 *         Nhờ vậy mọi chức năng cấu hình (đáp án, xáo trộn, ảnh, hotspot, cloze,
 *         dropdown, matching...) đều hoạt động y hệt PC, không mất gì.
 * Bước 2: bọc từng phần tử con của form vào một nhóm accordion.
 *
 * @param {Object} block - khối câu hỏi đang cấu hình
 */
function renderMobileEditorForm(block) {
    const pane = MobileEditorDOM.formPane;
    if (!pane) return;

    pane.innerHTML = '';

    /* --- 1. Dựng form gốc (dùng chung với PC) --- */
    const holder = htmlToElement('<div class="mobile-form-holder"></div>');
    pane.appendChild(holder);
    try {
        renderEditorFormInto(block, holder);
    } catch (e) {
        console.warn('Không dựng được form cấu hình:', e.message);
        return;
    }

    /* --- 2. Tách phần tử của form theo nhóm --- */
    const buckets = {
        question: [],   // nội dung câu hỏi
        answers: [],    // đáp án
        score: [],      // điểm & thời gian
        image: [],      // hình ảnh
        note: [],       // ghi chú & hướng dẫn
        advanced: []    // cài đặt nâng cao
    };

    /**
     * Xếp một phần tử form vào nhóm phù hợp.
     * @param {HTMLElement} el - phần tử cần xếp
     */
    function bucketize(el) {
        if (!el) return;

        // Nhận diện theo lớp CSS để đặt đúng nhóm
        if (el.classList.contains('image-form')) {
            buckets.image.push(el);
            return;
        }
        if (el.classList.contains('editor-match-area')
            || el.classList.contains('editor-hotspot-wrap')
            || el.classList.contains('dd-editor-list')
            || el.classList.contains('cloze-editor-fields')
            || el.querySelector('.row-list')) {
            buckets.answers.push(el);
            return;
        }

        // Dựa vào nhãn (label) của form-group để xếp các nhóm còn lại
        const label = el.querySelector('label');
        const text = label ? label.textContent : '';

        if (/ghi chú|hướng dẫn/i.test(text)) {
            buckets.note.push(el);
        } else if (/điểm|thời gian/i.test(text)) {
            buckets.score.push(el);
        } else if (/nội dung câu hỏi|tên \/ nội dung/i.test(text)) {
            buckets.question.push(el);
        } else if (el.classList.contains('switch-row')) {
            buckets.advanced.push(el);
        } else if (/xáo trộn|chế độ hiển thị|ngưỡng/i.test(text)) {
            buckets.advanced.push(el);
        } else {
            buckets.answers.push(el);
        }
    }

    // Rút các phần tử con ra khỏi form gốc để xếp nhóm
    Array.prototype.slice.call(holder.children).forEach(bucketize);
    holder.remove();

    /* --- 3. Dựng các nhóm accordion --- */
    const groups = [
        { key: 'question', title: '📝 Nội dung câu hỏi', open: true },
        { key: 'answers', title: '✅ Đáp án', open: true },
        { key: 'score', title: '⏱️ Điểm và thời gian', open: false },
        { key: 'image', title: '🖼️ Hình ảnh', open: false },
        { key: 'note', title: '📝 Ghi chú và hướng dẫn', open: false },
        { key: 'advanced', title: '⚙️ Cài đặt nâng cao', open: false }
    ];

    groups.forEach(function (g) {
        const items = buckets[g.key];
        if (!items || items.length === 0) return;

        const content = htmlToElement('<div class="mobile-group-fields"></div>');
        items.forEach(function (el) { content.appendChild(el); });

        pane.appendChild(mobileFormGroup(g.title, content, g.open));
    });

    // Trường hợp hiếm: không có nhóm nào ⇒ hiện toàn bộ form
    if (!pane.children.length) {
        const fallback = htmlToElement('<div class="mobile-form-holder"></div>');
        pane.appendChild(fallback);
        try { renderEditorFormInto(block, fallback); } catch (e) { /* bỏ qua */ }
    }
}

/* ------------------------------------------------------------
 *  MỞ / ĐÓNG / CHUYỂN TAB
 * ------------------------------------------------------------ */

/**
 * Mở trang cấu hình toàn màn hình cho một câu hỏi.
 * @param {Object} block - khối câu hỏi cần cấu hình
 */
function openMobileEditor(block) {
    if (!block) return;

    buildMobileEditorShell();

    mobileEditingBlock = block;
    // Chụp bản sao dữ liệu để bấm "Hủy bỏ" có thể hoàn tác (dùng chung PC)
    if (typeof snapshotEditorData === 'function') snapshotEditorData(block);

    const meta = BLOCK_TYPES[block.type] || { icon: '❓', label: block.type };
    MobileEditorDOM.title.textContent = 'Cấu hình: ' + meta.label;

    // Bảo đảm chương trình khối lệnh tồn tại (dùng chung engine)
    if (typeof QuizCoding !== 'undefined' && QuizCoding.ensureProgram) {
        try { QuizCoding.ensureProgram(block.data); } catch (e) { /* bỏ qua */ }
    }

    renderMobileEditorForm(block);

    // Chuyển sang tab Cấu hình
    switchMobileEditorTab('config');

    MobileEditorDOM.root.hidden = false;
    document.body.classList.add('mobile-editor-open');
}

/**
 * Lưu cấu hình của câu hỏi đang chỉnh sửa (dùng chung hàm thu thập của PC).
 */
function saveMobileEditor() {
    if (!mobileEditingBlock) return;
    // Dùng CHUNG hàm thu thập dữ liệu của PC, truyền vùng form mobile
    try {
        collectEditorData(mobileEditingBlock, MobileEditorDOM.formPane);
    } catch (e) {
        console.warn('Không thu thập được dữ liệu:', e.message);
    }
    // Đồng bộ chương trình khối lệnh (nếu có) — dùng chung API của engine
    if (typeof QuizCodingUI !== 'undefined' && QuizCodingUI.sync) {
        try { QuizCodingUI.sync(); } catch (e) { /* bỏ qua */ }
    }
    showToast('💾 Đã lưu cấu hình.');
}

/**
 * Đóng trang cấu hình mobile.
 * @param {boolean} [cancel] - true nếu huỷ bỏ (hoàn tác dữ liệu)
 * @returns {boolean} true nếu đã đóng một lớp phủ mobile
 */
function closeMobileEditor(cancel) {
    if (!MobileEditorDOM.root || MobileEditorDOM.root.hidden) return false;

    // Chỉ huỷ bỏ (hoàn tác dữ liệu) khi người dùng bấm nút Hủy bỏ.
    // Khi đóng do đổi chế độ (đóng cưỡng bức) thì GIỮ dữ liệu đã sửa.
    if (cancel && mobileEditingBlock && typeof restoreEditorData === 'function') {
        restoreEditorData(mobileEditingBlock);
    }
    if (typeof QuizCodingUI !== 'undefined' && QuizCodingUI.unmount) {
        try { QuizCodingUI.unmount(); } catch (e) { /* bỏ qua */ }
    }

    MobileEditorDOM.root.hidden = true;
    MobileEditorDOM.formPane.innerHTML = '';
    MobileEditorDOM.codePane.innerHTML = '';
    document.body.classList.remove('mobile-editor-open');
    mobileEditingBlock = null;

    if (typeof renderMobileQuestionList === 'function') renderMobileQuestionList();
    if (typeof scheduleAutoSave === 'function') scheduleAutoSave();

    return true;
}

/**
 * Đóng lớp phủ mobile đang mở (dùng cho nút quay lại trên thanh công cụ).
 * @param {boolean} [force] - true để đóng dù đang ở chế độ desktop
 * @returns {boolean} true nếu đã đóng một lớp phủ
 */
function closeMobileOverlay(force) {
    if (!force && !isMobileView()) return false;

    // Huỷ thao tác tự mở trang cấu hình đang chờ (nếu có)
    if (typeof cancelMobileAutoOpen === 'function') cancelMobileAutoOpen();

    // Ưu tiên đóng trang lập trình khối trước, rồi tới trang cấu hình
    if (typeof closeMobileCodingScreen === 'function' && closeMobileCodingScreen(force)) return true;
    if (closeMobileEditor(false)) return true;

    return false;
}

/**
 * Chuyển tab của trang cấu hình mobile.
 * @param {string} tab - 'config' (Cấu hình) hoặc 'code' (Lập trình khối)
 */
function switchMobileEditorTab(tab) {
    if (tab !== 'config' && tab !== 'code') return;
    mobileEditorTab = tab;

    if (MobileEditorDOM.formPane) {
        MobileEditorDOM.formPane.hidden = (tab !== 'config');
    }
    if (MobileEditorDOM.codePane) {
        MobileEditorDOM.codePane.hidden = (tab !== 'code');
    }
    if (MobileEditorDOM.tabs) {
        MobileEditorDOM.tabs.querySelectorAll('[data-mob-tab]').forEach(function (btn) {
            btn.classList.toggle('is-active', btn.dataset.mobTab === tab);
            btn.setAttribute('aria-selected', btn.dataset.mobTab === tab ? 'true' : 'false');
        });
    }

    // Khi mở tab Lập trình khối ⇒ dựng giao diện khối lệnh (dùng chung engine)
    if (tab === 'code' && mobileEditingBlock) {
        if (typeof mountMobileCoding === 'function') {
            mountMobileCoding(mobileEditingBlock, MobileEditorDOM.codePane);
        }
    }
}

/* ------------------------------------------------------------
 *  GẮN SỰ KIỆN
 * ------------------------------------------------------------ */

/**
 * Gắn sự kiện cho trang cấu hình mobile (chỉ gắn một lần).
 */
function setupMobileEditor() {
    buildMobileEditorShell();
    const root = MobileEditorDOM.root;
    if (!root || root.dataset.ready === '1') return;
    root.dataset.ready = '1';

    /* --- Chuyển tab Cấu hình / Lập trình khối --- */
    MobileEditorDOM.tabs.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mob-tab]');
        if (!btn) return;
        switchMobileEditorTab(btn.dataset.mobTab);
    });

    /* --- Nút quay lại, Hủy bỏ, Lưu cấu hình --- */
    root.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mob-edit]');
        if (!btn) return;
        const action = btn.dataset.mobEdit;

        if (action === 'back') {
            // Quay lại: hỏi người dùng nếu đang chỉnh sửa
            if (mobileEditingBlock && !window.confirm('Thoát mà không lưu cấu hình?')) {
                return;
            }
            closeMobileEditor(true);
        } else if (action === 'cancel') {
            closeMobileEditor(true);
        } else if (action === 'save') {
            saveMobileEditor();
            closeMobileEditor(false);
        }
    });
}
