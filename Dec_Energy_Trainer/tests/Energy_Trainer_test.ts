
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


