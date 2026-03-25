import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializamos Resend con la llave de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, mensaje, userId } = body;

    if (!mensaje) {
      return NextResponse.json({ error: "El mensaje está vacío" }, { status: 400 });
    }

    // Usamos tu correo verificado para enviar el mensaje a tu bandeja de entrada personal
    const { data, error } = await resend.emails.send({
      from: 'GastOS App <soporte@angeljoan.com>', 
      to: 'ajgamundi@gmail.com', 
      subject: `[GastOS ${tipo}] Nuevo ticket recibido`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: ${tipo === 'Bug' ? '#ef4444' : '#10b981'};">
            Nuevo ticket de tipo: ${tipo}
          </h2>
          <p><strong>Usuario ID:</strong> ${userId}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 16px; line-height: 1.5;">${mensaje}</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: "Hubo un error en el servidor" }, { status: 500 });
  }
}