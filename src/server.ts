import { app } from "./app.js";
import { env } from "./env/index.js";


app.listen({
    host: '0.0.0.0',
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
}).then(() => {
    console.log("HTTP Server Running")
})

