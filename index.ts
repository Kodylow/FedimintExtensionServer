import { Elysia } from 'elysia'
import { bearer } from '@elysiajs/bearer'

const validateToken = (token: string) => {
    return token === process.env["TOKEN"]
};

new Elysia()
    .use(bearer())
    .on('beforeHandle', ({ bearer, set }) => {
        if (!validateToken(bearer)) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }
    })
    .get('/balance', ({ set }) => {
        console.log("Balance")
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
