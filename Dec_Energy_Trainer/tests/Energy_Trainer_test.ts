
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Producer Registration Tests
Clarinet.test({
    name: "Ensure that producers can register with valid energy amount and price",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get("wallet_1")!;

        let block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "register-producer",
                [types.uint(1000), // energy amount
                types.uint(10)],  // price per unit
                producer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify producer info
        let result = chain.callReadOnlyFn(
            "Energy_Trainer",
            "get-producer-info",
            [types.principal(producer.address)],
            producer.address
        );

        assertEquals(result.result,
            '(ok {energy-available: u1000, energy-price: u10})');
    },
});

// Consumer Registration Tests
Clarinet.test({
    name: "Ensure that consumers can register successfully",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const consumer = accounts.get("wallet_2")!;

        let block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "register-consumer",
                [],
                consumer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify consumer info
        let result = chain.callReadOnlyFn(
            "Energy_Trainer",
            "get-consumer-info",
            [types.principal(consumer.address)],
            consumer.address
        );

        assertEquals(result.result,
            '(ok {energy-consumed: u0, total-spent: u0})');
    },
});

// Energy Purchase Tests
Clarinet.test({
    name: "Ensure that energy purchase works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get("wallet_1")!;
        const consumer = accounts.get("wallet_2")!;

        // Setup: Register producer and consumer
        let block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "register-producer",
                [types.uint(1000), types.uint(10)],
                producer.address
            ),
            Tx.contractCall("Energy_Trainer", "register-consumer",
                [],
                consumer.address
            )
        ]);

        // Purchase energy
        block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "buy-energy",
                [types.principal(producer.address),
                types.uint(100)], // buy 100 units
                consumer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify updated balances
        let producerInfo = chain.callReadOnlyFn(
            "Energy_Trainer",
            "get-producer-info",
            [types.principal(producer.address)],
            producer.address
        );

        assertEquals(producerInfo.result,
            '(ok {energy-available: u900, energy-price: u10})');
    },
});

// Rating System Tests
Clarinet.test({
    name: "Ensure that producer rating system works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get("wallet_1")!;
        const consumer = accounts.get("wallet_2")!;

        // Setup: Register, and make a purchase
        let block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "register-producer",
                [types.uint(1000), types.uint(10)],
                producer.address
            ),
            Tx.contractCall("Energy_Trainer", "register-consumer",
                [],
                consumer.address
            ),
            Tx.contractCall("Energy_Trainer", "buy-energy",
                [types.principal(producer.address), types.uint(100)],
                consumer.address
            )
        ]);

        // Rate producer
        block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "rate-producer",
                [types.principal(producer.address),
                types.uint(5)], // 5-star rating
                consumer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');

        // Try rating without purchase history
        const newConsumer = accounts.get("wallet_3")!;
        block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "rate-producer",
                [types.principal(producer.address),
                types.uint(5)],
                newConsumer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u107)');
    },
});

// Refund Tests
Clarinet.test({
    name: "Ensure that refund system works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const producer = accounts.get("wallet_1")!;
        const consumer = accounts.get("wallet_2")!;

        // Setup: Register, make purchase
        let block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "register-producer",
                [types.uint(1000), types.uint(10)],
                producer.address
            ),
            Tx.contractCall("Energy_Trainer", "register-consumer",
                [],
                consumer.address
            ),
            Tx.contractCall("Energy_Trainer", "buy-energy",
                [types.principal(producer.address), types.uint(100)],
                consumer.address
            )
        ]);

        // Request refund
        block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "request-refund",
                [types.principal(producer.address),
                types.uint(50)], // refund 50 units
                consumer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');

        // Try refunding more than purchased
        block = chain.mineBlock([
            Tx.contractCall("Energy_Trainer", "request-refund",
                [types.principal(producer.address),
                types.uint(200)],
                consumer.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u108)');
    },
});



