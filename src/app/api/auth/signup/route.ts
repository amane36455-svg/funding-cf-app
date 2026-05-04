import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { fail, ok } from '@/lib/http/apiResponse';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
  } | null;

  if (!body?.email || !body.password || body.password.length < 8) {
    return fail('INVALID_SIGNUP', 'メールアドレスと8文字以上のパスワードを入力してください', 400);
  }

  const email = body.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return fail('EMAIL_TAKEN', 'このメールアドレスは既に登録されています', 409);
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: body.name || null,
      passwordHash: await bcrypt.hash(body.password, 10),
    },
    select: { id: true, email: true, name: true },
  });

  return ok({ user }, 201);
}
