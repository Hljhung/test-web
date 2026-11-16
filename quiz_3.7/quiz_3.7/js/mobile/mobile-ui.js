/* ============================================================================
 *  MODULE: js/mobile/mobile-ui.js — LỚP GIAO DIỆN ĐIỆN THOẠI (bản 2.8)
 *  ---------------------------------------------------------------------------
 *  Vai trò:
 *    - buildMobileShell()   : dựng khung giao diện mobile (topbar + 2 chế độ).
 *    - setupMobileNav()     : điều hướng giữa Thiết kế / Xem trước.
 *    - updateMobileSaveUI() : cập nhật nhãn trạng thái lưu trên topbar.
 *    - isMobileView()       : kiểm tra hiện tại có đang ở chế độ mobile.
 *
 *  VÌ SAO KHÔNG SỬA `index.html`?
 *    Toàn bộ giao diện mobile được dựng bằng JavaScript (JS) và chèn vào
 *    thân trang. Nhờ vậy:
 *      - index.html giữ nguyên cấu trúc cho phiên bản PC ⇒ không rủi ro.
 *      - Không cần sửa lại tệp HTML gốc khi thêm/sửa màn hình mobile.
 *      - Có thể dùng chung nguyên tử DOM với PC (cùng dữ liệu, cùng state).
 *
 *  QUY TẮC:
 *    - Mọi hàm ở đây chỉ hoạt động khi `isMobileView()` trả về true.
 *    - Không bao giờ ẩn/hiện các phần tử PC bằng `display:none` vĩnh viễn.
 * ========================================================================== */


/* ------------------------------------------------------------
 *  HẰNG SỐ & TRẠNG THÁI
 * ------------------------------------------------------------ */

/** Ngưỡng bề rộng (px) mà từ đó dùng giao diện desktop */
var MOBILE_BREAKPOINT = 1000;

/** Chế độ hiển thị hiện tại: 'design' (Thiết kế) | 'preview' (Xem trước) */
var mobileMode = 'design';

/** Tham chiếu tới các phần tử của giao diện mobile (dựng một lần) */
var MobileDOM = {
    root: null,        // <div id="mobile-root"> bọc toàn bộ
    topbar: null,      // thanh công cụ trên cùng
    backBtn: null,     // nút quay lại
    title: null,       // tên dự án
    saveState: null,   // nhãn trạng thái lưu
    menuBtn: null,     // nút menu tuỳ chọn dự án
    menu: null,        // menu tuỳ chọn dự án
    tabs: null,        // thanh chuyển chế độ (Thiết kế / Xem trước)
    body: null,        // vùng chứa nội dung theo chế độ
    designPane: null,  // vùng danh sách câu hỏi (chế độ Thiết kế)
    previewPane: null, // vùng xem trước (chế độ Xem trước)
    fab: null          // nút thêm câu hỏi (FAB) ở đáy màn hình
};

/**
 * Kiểm tra hiện tại có đang ở chế độ điện thoại hay không.
 * @returns {boolean} true nếu bề rộng màn hình nhỏ hơn ngưỡng
 */
function isMobileView() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

/**
 * Thông báo cho các module khác biết chế độ hiển thị đã đổi.
 * @param {string} mode - 'design' hoặc 'preview'
 */
function notifyMobileModeChange(mode) {
    document.dispatchEvent(new CustomEvent('quiz-mobile-mode', {
        detail: { mode: mode }
    }));
}

/**
 * Chuyển chế độ hiển thị hiện tại của giao diện mobile.
 * @param {string} mode - 'design' (Thiết kế) hoặc 'preview' (Xem trước)
 */
function setMobileMode(mode) {
    if (mode !== 'design' && mode !== 'preview') return;
    mobileMode = mode;

    if (MobileDOM.designPane) {
        MobileDOM.designPane.hidden = (mode !== 'design');
    }
    if (MobileDOM.previewPane) {
        MobileDOM.previewPane.hidden = (mode !== 'preview');
    }

    // Cập nhật trạng thái active của hai nút chuyển chế độ
    if (MobileDOM.tabs) {
        MobileDOM.tabs.querySelectorAll('[data-mobile-mode]').forEach(function (btn) {
            btn.classList.toggle('is-active', btn.dataset.mobileMode === mode);
            btn.setAttribute('aria-selected', btn.dataset.mobileMode === mode ? 'true' : 'false');
        });
    }

    // Khi vào chế độ xem trước ⇒ dựng lại bản xem trước mới nhất
    if (mode === 'preview' && typeof renderMobilePreview === 'function') {
        try { renderMobilePreview(); } catch (e) { console.warn('renderMobilePreview failed', e.message); }
    }
    // Khi quay lại chế độ thiết kế ⇒ làm mới danh sách câu hỏi
    if (mode === 'design' && typeof renderMobileQuestionList === 'function') {
        try { renderMobileQuestionList(); } catch (e) { console.warn('renderMobileQuestionList failed', e.message); }
    }

    notifyMobileModeChange(mode);
}

/**
 * Cập nhật nhãn trạng thái lưu trên thanh công cụ mobile.
 * @param {{state:string, label:string, error:string}} info - thông tin trạng thái
 */
function updateMobileSaveUI(info) {
    if (!MobileDOM.saveState) return;
    var state = info && info.state ? info.state : 'idle';
    MobileDOM.saveState.textContent = info && info.label ? info.label : '';
    MobileDOM.saveState.dataset.state = state;
    MobileDOM.saveState.title = (state === 'error' && info.error)
        ? ('Lỗi lưu: ' + info.error)
        : '';
}


/**
 * Dựng khung giao diện mobile và gắn sự kiện.
 * Chỉ chạy một lần; các lần sau chỉ cập nhật trạng thái hiển thị.
 */
function buildMobileShell() {
    if (!MobileDOM.root) {
        var root = htmlToElement(
            '<div id="mobile-root" class="mobile-root" hidden>'
            + '  <header class="mobile-topbar">'
            + '    <button type="button" class="mobile-icon-btn" data-mobile-action="back"'
            + '            title="Quay lại" aria-label="Quay lại">‹</button>'
            + '    <input type="text" class="mobile-project-title" value="Dự án Quiz của tôi"'
            + '           aria-label="Tên dự án">'
            + '    <span class="mobile-save-state" data-state="idle"></span>'
            + '    <button type="button" class="mobile-icon-btn" data-mobile-action="menu"'
            + '            title="Tuỳ chọn dự án" aria-label="Tuỳ chọn dự án">⋯</button>'
            + '    <div class="mobile-menu" hidden role="menu">'
            + '      <button type="button" class="mobile-menu-item" data-action="new">🆕 Dự án mới</button>'
            + '      <button type="button" class="mobile-menu-item" data-action="save">💾 Lưu dự án</button>'
            + '      <button type="button" class="mobile-menu-item" data-action="load">📂 Mở dự án đã lưu</button>'
            + '      <button type="button" class="mobile-menu-item" data-action="export">📤 Xuất ra tệp JSON</button>'
            + '      <button type="button" class="mobile-menu-item" data-action="import">📥 Nhập từ tệp JSON</button>'
            + '    </div>'
            + '  </header>'
            + '  <nav class="mobile-mode-tabs" role="tablist">'
            + '    <button type="button" class="mobile-mode-tab is-active" data-mobile-mode="design"'
            + '            role="tab" aria-selected="true">✏️ Thiết kế</button>'
            + '    <button type="button" class="mobile-mode-tab" data-mobile-mode="preview"'
            + '            role="tab" aria-selected="false">👁️ Xem trước</button>'
            + '  </nav>'
            + '  <main class="mobile-body">'
            + '    <section class="mobile-pane mobile-design-pane"></section>'
            + '    <section class="mobile-pane mobile-preview-pane" hidden></section>'
            + '  </main>'
            + '  <button type="button" class="mobile-fab" data-mobile-action="add-question"'
            + '          title="Thêm câu hỏi" aria-label="Thêm câu hỏi">＋</button>'
            + '</div>'
        );
        document.body.appendChild(root);

        MobileDOM.root = root;
        MobileDOM.topbar = root.querySelector('.mobile-topbar');
        MobileDOM.backBtn = root.querySelector('[data-mobile-action="back"]');
        MobileDOM.title = root.querySelector('.mobile-project-title');
        MobileDOM.saveState = root.querySelector('.mobile-save-state');
        MobileDOM.menuBtn = root.querySelector('[data-mobile-action="menu"]');
        MobileDOM.menu = root.querySelector('.mobile-menu');
        MobileDOM.tabs = root.querySelector('.mobile-mode-tabs');
        MobileDOM.body = root.querySelector('.mobile-body');
        MobileDOM.designPane = root.querySelector('.mobile-design-pane');
        MobileDOM.previewPane = root.querySelector('.mobile-preview-pane');
        MobileDOM.fab = root.querySelector('.mobile-fab');
    }

    setupMobileNav();
    updateMobileShellVisibility();
}


/**
 * Gắn các sự kiện của giao diện mobile (chỉ gắn một lần).
 */
function setupMobileNav() {
    if (!MobileDOM.root || MobileDOM.root.dataset.navReady === '1') return;
    MobileDOM.root.dataset.navReady = '1';

    /* --- Chuyển chế độ Thiết kế / Xem trước --- */
    MobileDOM.tabs.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-mobile-mode]');
        if (!btn) return;
        setMobileMode(btn.dataset.mobileMode);
    });

    /* --- Nút quay lại: đóng màn hình con đang mở, nếu không có thì về Thiết kế --- */
    MobileDOM.backBtn.addEventListener('click', function () {
        if (typeof closeMobileOverlay === 'function' && closeMobileOverlay()) return;
        if (mobileMode !== 'design') {
            setMobileMode('design');
            return;
        }
        if (typeof stopQuiz === 'function' && DOM.playerView.style.display === 'flex') {
            stopQuiz();
        }
    });

    /* --- Menu tuỳ chọn dự án --- */
    MobileDOM.menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        MobileDOM.menu.hidden = !MobileDOM.menu.hidden;
    });
    MobileDOM.menu.addEventListener('click', function (e) {
        const item = e.target.closest('.mobile-menu-item');
        if (!item) return;
        MobileDOM.menu.hidden = true;
        // Dùng chung bộ xử lý của menu File trên PC
        if (typeof handleFileAction === 'function') handleFileAction(item.dataset.action);
    });
    document.addEventListener('click', function () {
        if (MobileDOM.menu) MobileDOM.menu.hidden = true;
    });

    /* --- Đồng bộ tên dự án giữa PC và mobile (cùng một trường dữ liệu) --- */
    MobileDOM.title.addEventListener('input', function () {
        if (DOM.projectTitle) DOM.projectTitle.value = MobileDOM.title.value;
        if (typeof scheduleAutoSave === 'function') scheduleAutoSave();
    });

    /* --- Nút thêm câu hỏi (FAB) --- */
    MobileDOM.fab.addEventListener('click', function () {
        if (typeof openMobileAddQuestionSheet === 'function') openMobileAddQuestionSheet();
    });

    /* --- Trạng thái lưu --- */
    if (typeof subscribeSaveState === 'function') {
        subscribeSaveState(function (info) { updateMobileSaveUI(info); });
    }
}


/**
 * Hiện / ẩn giao diện mobile theo bề rộng màn hình hiện tại.
 * Khi chuyển từ mobile sang PC, mọi màn hình mobile đang mở sẽ được đóng lại.
 */
function updateMobileShellVisibility() {
    if (!MobileDOM.root) return;
    const mobile = isMobileView();

    MobileDOM.root.hidden = !mobile;

    // Khi rời chế độ mobile ⇒ đóng mọi lớp phủ mobile để không chắn PC
    if (!mobile) {
        if (typeof closeMobileOverlay === 'function') closeMobileOverlay(true);
        if (typeof closeMobileSheets === 'function') closeMobileSheets();
    }

    // Đồng bộ tên dự án hai chiều
    if (mobile && MobileDOM.title && DOM.projectTitle) {
        if (document.activeElement !== MobileDOM.title) {
            MobileDOM.title.value = DOM.projectTitle.value;
        }
    }
}

/**
 * Khởi tạo toàn bộ hệ thống giao diện mobile.
 * Được gọi một lần khi ứng dụng bắt đầu và mỗi khi đổi kích thước màn hình.
 */
function initMobileUI() {
    buildMobileShell();

    if (typeof setupMobileQuestionList === 'function') setupMobileQuestionList();
    if (typeof setupMobileEditor === 'function') setupMobileEditor();
    if (typeof setupMobileCoding === 'function') setupMobileCoding();
    if (typeof setupMobilePlayer === 'function') setupMobilePlayer();

    updateMobileShellVisibility();
}

/**
 * Gắn sự kiện resize để chuyển qua lại giữa giao diện PC và mobile.
 */
function setupMobileResize() {
    if (typeof window === 'undefined') return;
    if (window.__mobileResizeReady) return;
    window.__mobileResizeReady = true;

    var raf = null;
    window.addEventListener('resize', function () {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
            raf = null;
            updateMobileShellVisibility();
            // Vùng làm việc PC đổi kích thước ⇒ vẽ lại bản xem trước
            if (typeof fitStagePlayerPreview === 'function') fitStagePlayerPreview();
        });
    });

    // Khi xoay máy, hướng màn hình đổi ⇒ cập nhật lại giao diện
    if (typeof window.matchMedia === 'function') {
        var mq = window.matchMedia('(orientation: portrait)');
        var onChange = function () { updateMobileShellVisibility(); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
    }
}
