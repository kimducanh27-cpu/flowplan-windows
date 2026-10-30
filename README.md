# FlowPlan — Windows x64 (portable)

Bản build Windows 64-bit của [FlowPlan](https://github.com/Bariskau/flowplan) — bảng kế hoạch trực quan cho AI coding agent (Qoder, Claude Code, Cursor, Codex, Gemini CLI...).

> Đây là **bản build cộng đồng**, không phải bản phát hành chính thức của tác giả FlowPlan.

## Checksums (SHA256)

| File | SHA256 |
|---|---|
| `FlowPlan-1.3.2-windows-x64.zip` (app) | `6b2b7f5a493e028289699da6efe63b9abe61578aee6767259bd15ef00df0d981` |
| `flowplan-windows-skill.zip` (skill) | `f05a112a75774fa82c3804f331a6975239ba992ef0c28eecb115ad042bcd08c7` |

Các hash trên khớp với file đang phát hành; có thể kiểm tra lại bằng `sha256sum` hoặc `Get-FileHash`.

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
Hãy lập kế hoạch làm [việc bạn muốn làm] và hiển thị lên FlowPlan.

Yêu cầu:
- Mỗi bước là một thẻ FlowPlan gồm: tiêu đề, mô tả, loại (research/planning/create/edit/test), file liên quan.
- Mỗi thẻ phải nói rõ dùng skill, plugin, mcp nào, nếu trong quá trình còn thiếu tự mò thêm skill
- Các thẻ phải có thứ tự phụ thuộc rõ ràng.
- Đừng bắt đầu code vội; chỉ lập kế hoạch để tôi duyệt trước.
- Dùng công cụ FlowPlan: gọi create_plan, sau đó add_cards. Nếu thêm nhiều thẻ cùng lúc, dùng dependencies "$0", "$1"... để trỏ đến thẻ trước đó.
----
Kế hoạch đã duyệt. Bắt đầu làm theo đúng thứ tự các thẻ trên FlowPlan.
Sau mỗi bước, cập nhật lại thẻ nếu cần.
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

## Skill cho AI agent (Qoder)

Thư mục [`skill/flowplan-windows/`](skill/flowplan-windows/) chứa skill để agent khác tự động build, update, đóng gói và publish FlowPlan Windows.

**Cài nhanh:**

1. Tải [`flowplan-windows-skill.zip`](skill/flowplan-windows-skill.zip) (hoặc copy thư mục `skill/flowplan-windows`).
2. Giải nén vào `C:\Users\<bạn>\.qoder\skills\` để có `...\.qoder\skills\flowplan-windows\`.
3. Chạy `/skills reload` hoặc khởi động lại Qoder.
4. Gọi `/flowplan-windows`, hoặc nói: “Cập nhật FlowPlan Windows lên bản mới nhất”.

Skill gồm quy trình build Rust GNU/MSYS2, 2 patch bắt buộc (`custom-protocol`, GUI subsystem), script đóng gói ZIP + SHA256, smoke test MCP và publish release.

SHA256 của file zip: `f05a112a75774fa82c3804f331a6975239ba992ef0c28eecb115ad042bcd08c7` ([file .sha256](skill/flowplan-windows-skill.zip.sha256))

## Giấy phép

MIT. Xem [LICENSE](LICENSE). FlowPlan thuộc về tác giả upstream Barış ÖZER và contributors.
