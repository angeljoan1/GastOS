import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Cliente de Supabase con la service role key para verificar sesiones server-side.
// La anon key no es suficiente para verificar tokens de usuario en el servidor.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  try {
    // Verificar que la petición viene de un usuario autenticado
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const body = await request.json();
    const { tipo, mensaje } = body;

    if (!mensaje) {
      return NextResponse.json({ error: "El mensaje está vacío" }, { status: 400 });
    }

    const esc = (s: string) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const safeMsg    = esc(mensaje)
    const safeTipo   = esc(tipo ?? '')
    const safeEmail  = esc(user.email ?? '')
    const safeUserId = esc(user.id)

    const { data, error } = await resend.emails.send({
      from: 'GastOS App <soporte@angeljoan.com>',
      to: process.env.FEEDBACK_TO_EMAIL!,
      subject: `[GastOS ${tipo}] Nuevo ticket recibido`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: ${safeTipo === 'Bug' ? '#ef4444' : '#10b981'};">
            Nuevo ticket de tipo: ${safeTipo}
          </h2>
          <p><strong>Usuario ID:</strong> ${safeUserId}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 16px; line-height: 1.5;">${safeMsg}</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Feedback route error:', error)
    return NextResponse.json({ error: "Hubo un error en el servidor" }, { status: 500 });
  }
}