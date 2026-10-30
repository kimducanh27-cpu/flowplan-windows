# FlowPlan — Windows x64 (portable)

Bản build Windows 64-bit của [FlowPlan](https://github.com/Bariskau/flowplan) — bảng kế hoạch trực quan cho AI coding agent (Qoder, Claude Code, Cursor, Codex, Gemini CLI...).

> Đây là **bản build cộng đồng**, không phải bản phát hành chính thức của tác giả FlowPlan.

## Tải về

- **[Bản mới nhất](https://github.com/kimducanh27-cpu/flowplan-windows/releases/latest)**
- File: `FlowPlan-1.3.2-windows-x64.zip` (~9.8 MB)
- SHA256: `6b2b7f5a493e028289699da6efe63b9abe61578aee6767259bd15ef00df0d981`

## Cài đặt

1. Tải file zip và giải nén.
2. Giữ `FlowPlan.exe` và `WebView2Loader.dll` **cùng một thư mục**.
3. Nhấp đúp `FlowPlan.exe`.
4. Nếu Windows SmartScreen cảnh báo: bấm **More info → Run anyway** (bản build chưa ký số).

**Yêu cầu:** Windows 10/11 64-bit + WebView2 Runtime (Windows 11 có sẵn; Windows 10 nếu thiếu thì tải “Microsoft Edge WebView2 Runtime” từ Microsoft).

## Dùng với AI agent (MCP)

Mở FlowPlan trước — MCP server chỉ chạy khi app đang mở.

- URL: `http://127.0.0.1:3100/mcp`
- Transport: HTTP / Streamable HTTP

**Claude Code:**

```bash
claude mcp add flowplan --transport http http://127.0.0.1:3100/mcp
```

**JSON cho Qoder / Cursor / Codex / app MCP khác:**

```json
{
  "mcpServers": {
    "flowplan": {
      "type": "http",
      "url": "http://127.0.0.1:3100/mcp"
    }
  }
}
```

Sau đó nhờ agent:

```text
Hãy lập kế hoạch làm [việc bạn muốn] và hiển thị lên FlowPlan.
Dùng công cụ FlowPlan: gọi create_plan rồi add_cards.
Đừng code vội; chỉ lập kế hoạch để tôi duyệt trước.
```

## Dữ liệu

- Lưu tại `%USERPROFILE%\.plan-visual-planner\`.
- Sao lưu: đóng app, copy cả thư mục.
- Khôi phục: copy thư mục cũ đè lại rồi mở app.

## Ghi chú build

- Upstream: **FlowPlan v1.3.2**, commit `25a6cf2`, giấy phép MIT.
- Build bằng **Rust GNU + MSYS2/MinGW** (môi trường build không có MSVC).
- Hai thay đổi nhỏ so với upstream:
  - bật feature `custom-protocol` để nhúng giao diện vào app;
  - thêm `windows_subsystem = "windows"` để không hiện cửa sổ console.
- Bản portable, không có updater tự động.
- Repo này chỉ phát hành binary; source nằm ở upstream.

## Giấy phép

MIT. Xem [LICENSE](LICENSE). FlowPlan thuộc về tác giả upstream Barış ÖZER và contributors.
