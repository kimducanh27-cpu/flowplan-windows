## FlowPlan {{VERSION}} — Windows x64 (portable)

Bản build Windows 64-bit của [FlowPlan](https://github.com/Bariskau/flowplan) phiên bản **{{VERSION}}**, dùng cho Qoder, Claude Code, Cursor, Codex và các agent hỗ trợ MCP.

> Bản build cộng đồng, **không phải bản phát hành chính thức** của tác giả FlowPlan.

### Tải và chạy

1. Tải `{{ZIP_NAME}}` bên dưới và giải nén.
2. Giữ `FlowPlan.exe` và `WebView2Loader.dll` cùng một thư mục.
3. Nhấp đúp `FlowPlan.exe`.
4. Nếu SmartScreen cảnh báo: **More info → Run anyway** (chưa ký số).

Yêu cầu: Windows 10/11 64-bit + WebView2 Runtime (Windows 11 có sẵn).

### Dùng với AI agent (MCP)

Mở FlowPlan trước, sau đó thêm MCP server:

- URL: `http://127.0.0.1:3100/mcp`
- Transport: HTTP / Streamable HTTP

```bash
claude mcp add flowplan --transport http http://127.0.0.1:3100/mcp
```

```json
{
  "mcpServers": {
    "flowplan": { "type": "http", "url": "http://127.0.0.1:3100/mcp" }
  }
}
```

### SHA256

`{{SHA256}}`  `{{ZIP_NAME}}`

### Ghi chú

- Upstream FlowPlan v{{VERSION}}, giấy phép MIT.
- Build bằng Rust GNU + MSYS2/MinGW; feature `custom-protocol` và GUI subsystem.
- Portable, không có updater tự động.
- Data: `%USERPROFILE%\.plan-visual-planner\`.
