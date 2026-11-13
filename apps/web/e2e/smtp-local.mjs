// Captura SMTP exclusiva dos testes, ligada apenas ao loopback. Nunca encaminha e-mail.
import net from "node:net";
import http from "node:http";
const mensagens = [];
net
  .createServer((socket) => {
    let buffer = "",
      corpo = "",
      para = "",
      dados = false;
    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP teste\r\n");
    socket.on("data", (parte) => {
      buffer += parte;
      let fim;
      while ((fim = buffer.indexOf("\r\n")) !== -1) {
        const linha = buffer.slice(0, fim);
        buffer = buffer.slice(fim + 2);
        if (dados) {
          if (linha === ".") {
            mensagens.push({ para, corpo });
            dados = false;
            corpo = "";
            socket.write("250 capturado\r\n");
          } else corpo += linha + "\r\n";
        } else if (/^(EHLO|HELO)/i.test(linha))
          socket.write("250 localhost\r\n");
        else if (/^RCPT TO:/i.test(linha)) {
          para = /<([^>]+)>/.exec(linha)?.[1] || "";
          socket.write("250 ok\r\n");
        } else if (/^DATA$/i.test(linha)) {
          dados = true;
          socket.write("354 termine com ponto\r\n");
        } else if (/^QUIT$/i.test(linha)) socket.end("221 fim\r\n");
        else socket.write("250 ok\r\n");
      }
    });
    socket.on("error", () => {});
  })
  .listen(1026, "127.0.0.1");
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:8026");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify(
        url.pathname === "/mensagens"
          ? mensagens.filter((m) => m.para === url.searchParams.get("para"))
          : { ok: true },
      ),
    );
  })
  .listen(8026, "127.0.0.1");
