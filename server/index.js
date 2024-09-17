import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());

app.use(cors({origin: "*"}));

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.post('/generate', async(req, res) => {
    const {queryDescription} = req.body;
    console.log(queryDescription);
    res.json({answer: "The answer goes here"});
})

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});