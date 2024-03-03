import { Elysia } from 'elysia'
import { bearer } from '@elysiajs/bearer'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const getUser = async (token: string) => {
    return await prisma.user.findUnique({
        where: {
            token: token,
        },
    });
};

new Elysia()
    .use(bearer())
    .on('beforeHandle', async ({ bearer, set }) => {
        if (bearer == null) {
            set.status = 401;
            return "Unauthorized: No token"
        }
        const user = await getUser(bearer);
        if (user == null) {
            set.status = 401;
            return "Unauthorized: Invalid token"
        }
    })
    .derive(async ({ bearer, set }) => {
        if (bearer == null) {
            set.status = 401;
            return "Unauthorized: No token"
        }
        const user = await getUser(bearer);
        return { user };
    })
    .get('/balance', ({ user, set }: any) => {
        console.log("user", user)
        return user.balance;
    })
    .post('/pay-invoice', ({ set }) => {
        console.log("Pay Invoice")
    })
    .post('/create-invoice', ({ set }) => {
        console.log("Create Invoice")
    })
    .post('/spend-ecash', ({ set }) => {
        console.log("Spend Ecash")
    })
    .post('/receive-ecash', ({ set }) => {
        console.log("Receive Ecash")
    })
    .listen(8080)
console.log('Server running on http://localhost:8080');
