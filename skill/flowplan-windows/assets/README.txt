FlowPlan {{VERSION}} — Windows x64 (portable)
=============================================

CÁCH CHẠY
1. Giải nén thư mục này ra một nơi cố định (ví dụ D:\Apps\FlowPlan).
2. Giữ FlowPlan.exe và WebView2Loader.dll CÙNG một thư mục.
3. Nhấp đúp FlowPlan.exe.
4. Nếu Windows SmartScreen cảnh báo lần đầu: bấm More info → Run anyway.
   (Đây là bản build cộng đồng, chưa ký số.)

YÊU CẦU
- Windows 10/11 64-bit.
- WebView2 Runtime (Windows 11 có sẵn; Windows 10 nếu thiếu thì tải
  "Microsoft Edge WebView2 Runtime" từ trang Microsoft).

DÙNG VỚI AI (MCP)
- Mở FlowPlan trước — MCP server chỉ chạy khi app đang mở.
- Địa chỉ MCP: http://127.0.0.1:3100/mcp
  Transport: HTTP / Streamable HTTP

- Claude Code (terminal):
  claude mcp add flowplan --transport http http://127.0.0.1:3100/mcp

- JSON cho Cursor/Qoder/Codex hoặc app MCP khác:
  {
    "mcpServers": {
      "flowplan": {
        "type": "http",
        "url": "http://127.0.0.1:3100/mcp"
      }
    }
  }

DỮ LIỆU
- Lưu tại: %USERPROFILE%\.plan-visual-planner\
- Sao lưu: đóng app, copy cả thư mục trên.
- Khôi phục: copy thư mục cũ đè lại rồi mở app.

NGUỒN & GIẤY PHÉP
- FlowPlan upstream: https://github.com/Bariskau/flowplan (MIT)
- Đây là bản build Windows KHÔNG chính thức từ mã nguồn upstream.
- Build bằng Rust GNU/MinGW, giao diện nhúng (custom-protocol), không console.
- Không có updater tự động; muốn bản mới thì tải lại.

PHIÊN BẢN
- FlowPlan {{VERSION}}
- Build ngày {{DATE}}
