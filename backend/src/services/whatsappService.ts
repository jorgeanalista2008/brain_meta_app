import { config } from "../config/env.js";

export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const { accessToken, phoneNumberId, apiVersion } = config.meta;

  if (!accessToken || !phoneNumberId) {
    console.warn("⚠️ [WhatsApp Service] META_ACCESS_TOKEN o META_PHONE_NUMBER_ID no configurados. Mensaje simulado:");
    console.log(`📲 [WhatsApp Outgoing -> ${to}]: ${message}`);
    return false;
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: message },
      }),
    });

    const data: any = await res.json();
    if (!res.ok) {
      console.error("❌ Error enviando mensaje por WhatsApp API:", data);
      return false;
    }

    console.log(`✅ [WhatsApp Enviado a ${to}]: ID=${data?.messages?.[0]?.id}`);
    return true;
  } catch (error) {
    console.error("❌ Excepción enviando WhatsApp:", error);
    return false;
  }
}
