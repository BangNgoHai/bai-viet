# Bài Việt

Web chơi bài online gồm **Xì dách** và **Tiến lên Miền Nam**, tạo phòng bằng mã 6 ký tự, mời bạn bè, chat trong phòng, chơi với bot và tự động vào lại khi mất kết nối.

## Tính năng

- Tạo phòng / vào phòng bằng mã hoặc link mời (`/?room=ABC123`).
- Phòng cần ít nhất 2 người; chơi một mình có nút **Chơi với bot**.
- **Xì dách**: nhà cái luân phiên, đặt cược chip, rút/dừng, xì bàng, xì dách, ngũ linh, quắc.
- **Tiến lên Miền Nam**: 4 người (tự điền bot), 3♠ đi trước, sảnh/đôi thông/tứ quý, tứ quý chặt 2, tính điểm qua từng ván.
- Chat realtime trong phòng, thông báo hệ thống.
- Mất mạng / tải lại trang vẫn vào lại đúng phòng; khi mất kết nối bot chơi thay.
- Lưu người chơi, lịch sử trận và bảng xếp hạng vào SQLite (Prisma).

## Công nghệ

- `client/`: React + Vite + TypeScript + Tailwind CSS + Zustand + Socket.IO client.
- `server/`: Node.js + Express + Socket.IO + Prisma (SQLite).
- `shared/`: type và tiện ích bài dùng chung.
- Toàn bộ luật bài được xử lý ở server (server authoritative), client chỉ hiển thị.

## Chạy local

Yêu cầu Node.js 18+.

```bash
npm install
npm run db:push      # tạo database SQLite + schema
npm run dev          # chạy server :3001 và client :5173
```

Mở http://localhost:5173.

Chơi thử một mình: nhập tên → chọn game → **Tạo phòng** → **Chơi với bot**.

Chơi với bạn: tạo phòng → copy link/mã → bạn bè mở link hoặc nhập mã ở tab **Vào bằng mã**.

## Build production

```bash
npm run build        # build client vào client/dist
npm start            # build lại client và chạy server tại :3001
```

Server tự phục vụ `client/dist` nếu thư mục tồn tại, nên chỉ cần mở http://localhost:3001.

Có thể deploy server lên Render/Railway/Fly và client lên Vercel/Netlify; khi tách domain, đặt biến môi trường `VITE_SERVER_URL` cho client và cấu hình CORS (server đã cho phép mọi origin).

## Deploy Render

Repo đã có sẵn `render.yaml` (Blueprint). Trên Render:

1. **New → Blueprint** → chọn repo GitHub `bai-viet`.
2. Render tự đọc cấu hình:
   - Build: `npm install && npm run build && npm run db:push -w server`
   - Start: `npm run start -w server`
   - Health check: `/health`
   - Region: Singapore, plan Free.
3. Sau khi deploy xong, gửi URL `https://bai-viet-xxxx.onrender.com` cho bạn bè.

Nếu tạo **Web Service** thủ công, dùng đúng 3 lệnh/cấu hình trên và thêm biến `NODE_VERSION=20.18.1`.

Lưu ý:

- Free plan của Render dùng ổ đĩa tạm, nên `server/prisma/dev.db` (bảng xếp hạng/lịch sử) sẽ reset sau mỗi lần deploy hoặc restart. Phòng chơi và ván đang chơi vốn nằm trong RAM nên cũng reset. Muốn giữ dữ liệu lâu dài: dùng Render PostgreSQL (đổi `provider = "postgresql"` + `DATABASE_URL`) hoặc gắn Persistent Disk (plan trả phí).
- Free web service sẽ "ngủ" sau ~15 phút không có người truy cập; lần mở đầu tiên có thể chậm 30–60 giây.
- Server tự phục vụ cả client và Socket.IO trên cùng domain, không cần cấu hình CORS hay biến môi trường phía client.

## Cấu trúc

```
game/
├── client/                 # React app
│   └── src/
│       ├── components/     # Home, Room, Card, Seat, Chat...
│       ├── store.ts        # Zustand + socket actions
│       └── socket.ts
├── server/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── roomManager.ts  # phòng, chat, reconnect, bot scheduler
│       ├── xidach.ts       # luật xì dách
│       ├── tienlen.ts      # luật tiến lên
│       ├── combo.ts        # nhận diện & so sánh bộ bài
│       ├── bot-*.ts        # AI cho từng game
│       └── persist.ts      # ghi trận & thống kê
└── shared/                 # type + bộ bài dùng chung
```

## Ghi chú

- Database mặc định: `server/prisma/dev.db` (SQLite), đã nằm trong `.gitignore`.
- Xoá dữ liệu chơi thử: `rm server/prisma/dev.db && npm run db:push`.
- Đổi sang PostgreSQL: sửa `provider`/`url` trong `server/prisma/schema.prisma` rồi chạy lại `npm run db:push`.
- Chỉ chơi cho vui, không dùng để cá cược tiền thật.
