import { extrairMensagem } from "@/lib/whatsapp/uazapi";

const base = {
  message: {
    id: "3EB0ABC",
    fromMe: false,
    isGroup: false,
    sender: "5511999999999@s.whatsapp.net",
    text: "+50 bolo",
  },
};

test("extrai remetente (só dígitos), texto e id de um DM", () => {
  expect(extrairMensagem(base)).toEqual({
    remetente: "5511999999999",
    texto: "+50 bolo",
    messageId: "3EB0ABC",
    fromMe: false,
    isGroup: false,
  });
});

test("marca fromMe e isGroup", () => {
  const g = { message: { ...base.message, isGroup: true, sender: "12345@g.us" } };
  expect(extrairMensagem(g)?.isGroup).toBe(true);
  const meu = { message: { ...base.message, fromMe: true } };
  expect(extrairMensagem(meu)?.fromMe).toBe(true);
});

test("retorna null para payload sem mensagem, sem id ou sem texto", () => {
  expect(extrairMensagem(null)).toBeNull();
  expect(extrairMensagem({})).toBeNull();
  expect(extrairMensagem({ message: { id: "x", sender: "551199@s.whatsapp.net" } })).toBeNull(); // sem texto
  expect(extrairMensagem({ message: { sender: "551199@s.whatsapp.net", text: "oi" } })).toBeNull(); // sem id
});

test("aceita campos alternativos (messageid, content, chatid)", () => {
  const alt = { message: { messageid: "ID2", chatid: "5511888888888@s.whatsapp.net", content: "saldo" } };
  expect(extrairMensagem(alt)).toMatchObject({ remetente: "5511888888888", texto: "saldo", messageId: "ID2" });
});
