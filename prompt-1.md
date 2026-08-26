Read and apply `CLAUDE.md` for relevant context.

First task, the seed the data at `data/purchase-orders.ts`. 

I want an exported `PurchaseOrder` interface and a typed array of 10 records, plus the TODAY constant and the status union type.

Before writing it, show me the interface and the status union and stop. I want to agree on the shape before there are records shaped incorrectly.

Visually it should be designed in a way that it should be optimal for a client that wants to transition through order states. Think of someone having a job that relies on this data. 
