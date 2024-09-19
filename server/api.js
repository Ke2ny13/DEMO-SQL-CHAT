import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { SqlDatabase } from 'langchain/sql_db';
import { ChatOpenAI } from '@langchain/openai';
import { 
    RunnablePassthrough,
    RunnableSequence,
} from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { query } from 'express';


dotenv.config();
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
    console.error('OPENAI_API_KEY not found in environment variable')
    process.exit(1);
}

const datasource = new DataSource({
    type: 'sqlite',
    database: 'Chinook.db',
});

const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
})

const prompt =
PromptTemplate.fromTemplate(`Based on the table schema below, write a SQL query that would answer the user's question. Return just the SQL and nothing else:
{schema}

Question: {question}
SQL Query:`);

const model = new ChatOpenAI({
    apiKey: openaiApiKey,
    model: 'gpt-3.5-turbo',
    engine: 'davinci-codex',
    maxTokens: 128,
    stop: ["\nSQLResult:"],
});

// The `RunnablePassthrough.assign()` is used here to passthrough the input from the `.invoke()`
// call (in this example it's the question) along with any onputs to the `.assign()`method.
// In this case, we're passing the schema
const sqlQueryGeneratorChain = RunnableSequence.from([
    RunnablePassthrough.assign({
        schema: async () => db.getTableInfo(),
    }),
    prompt,
    model.bind({ stop: ["\nSQLResult:"]}),
    new StringOutputParser(),
]);

const generate = async (queryDescription) => {

    const finalResponsePrompt =
    PromptTemplate.fromTemplate(`Based on the table schema below, question, sql query, and sql response, write a natural language response:
    {schema}

    Question: {question}
    SQL Query: {query}
    SQL Response: {response}`);

    const fullChain = RunnableSequence.from([
    RunnablePassthrough.assign({
        query: sqlQueryGeneratorChain
    }),
    {
        schema: async () => db.getTableInfo(),
        question: (input) => input.question,
        query: (input) => input.query,
        response: (input) => db.run(input.query),
    },
    finalResponsePrompt,
    model,
    ]);

    const finalResponse = await fullChain.invoke({
    question: `${queryDescription}?`,
    });

    return finalResponse.content;
}

export default generate;