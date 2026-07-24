import { extrairMensagem } from "@/lib/whatsapp/uazapi";

// Baseado no payload REAL do uazapiGO v2 (webhook capturado em 24/07/2026): o
// número está em sender_pn/chatid; `sender` vem como @lid (LinkedID), que NÃO é
// o telefone. messageid é o id "limpo"; id vem prefixado (owner:messageid).
const base = {
  message: {
    messageid: "3A3C8B87F4DF0D4A8398",
    id: "5521968166603:3A3C8B87F4DF0D4A8398",
    fromMe: false,
    isGroup: false,
    chatid: "5521982454005@s.whatsapp.net",
    sender: "50006371381350@lid",
    sender_pn: "5521982454005@s.whatsapp.net",
    text: "+50 teste",
    content: "+50 teste",
  },
};

test("extrai o TELEFONE de sender_pn (não o @lid de sender), texto e id limpo de um DM", () => {
  expect(extrairMensagem(base)).toEqual({
    remetente: "5521982454005",
    texto: "+50 teste",
    messageId: "3A3C8B87F4DF0D4A8398",
    fromMe: false,
    isGroup: false,
  });
});

test("nunca usa o @lid de sender: sem sender_pn, cai no chatid (telefone)", () => {
  const semPn = { message: { ...base.message, sender_pn: undefined } };
  expect(extrairMensagem(semPn)?.remetente).toBe("5521982454005"); // do chatid, não o @lid
});

test("marca fromMe e isGroup", () => {
  const g = { message: { ...base.message, isGroup: true, chatid: "12345@g.us" } };
  expect(extrairMensagem(g)?.isGroup).toBe(true);
  const meu = { message: { ...base.message, fromMe: true } };
  expect(extrairMensagem(meu)?.fromMe).toBe(true);
});

test("retorna null para payload sem mensagem, sem id ou sem texto", () => {
  expect(extrairMensagem(null)).toBeNull();
  expect(extrairMensagem({})).toBeNull();
  expect(extrairMensagem({ message: { messageid: "x", chatid: "551199@s.whatsapp.net" } })).toBeNull(); // sem texto
  expect(extrairMensagem({ message: { chatid: "551199@s.whatsapp.net", text: "oi" } })).toBeNull(); // sem id
});

test("aceita campos alternativos (content quando falta text; id quando falta messageid)", () => {
  const alt = { message: { id: "ID2", chatid: "5511888888888@s.whatsapp.net", content: "saldo" } };
  expect(extrairMensagem(alt)).toMatchObject({ remetente: "5511888888888", texto: "saldo", messageId: "ID2" });
});

test("não lança e retorna null quando text/content não é string", () => {
  expect(extrairMensagem({ message: { messageid: "x", chatid: "5511999999999@s.whatsapp.net", text: 123 } })).toBeNull();
  expect(extrairMensagem({ message: { messageid: "x", chatid: "5511999999999@s.whatsapp.net", content: { foo: 1 } } })).toBeNull();
});
