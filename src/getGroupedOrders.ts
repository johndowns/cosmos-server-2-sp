function getGroupedOrders(productIds: string[]) {
    // capture the contextual variables we'll need
    var collection = getContext().getCollection();
    var response = getContext().getResponse();

    // run the core logic of the stored procedure
    var output = getGroupedOrdersImpl(productIds, collection);
    response.setBody(output);
}

function getGroupedOrdersImpl(productIds: string[], collection: ICollection) {
    var outputArray: CustomersGroupedByProduct[] = [];
    
    productIds.forEach(productId => {
        // set up a query to find the customers who ordered this product ID
        var query: IParameterizedQuery = {
            query: "SELECT VALUE udf.getCustomerId(c) FROM c WHERE ARRAY_CONTAINS(c.items, { productId: @productId }, true)",
            parameters: [
                { name: "@productId", value: productId }
            ]
        };
        var queryCallbackFunction = (error: IFeedCallbackError, results: string[], options: IFeedCallbackOptions) => {
            if (error) {
                // the query was accepted and processed, but something went wrong
                throw new Error("Error in query callback: " + error.body);
            }

            // we successfully received the customer IDs, so we can add them to the output array
            outputArray.push({
                productId: productId,
                customerIds: results
            });
        }
        var queryAccepted = collection.queryDocuments<string>(collection.getSelfLink(), query, queryCallbackFunction);
        if (! queryAccepted) {
            // the query wasn't accepted - this is likely because our stored procedure is running out of time in which to execute
            throw new Error("Query was not accepted for product ID " + productId);
        }
    });

    // set the stored procedure's response body
    return outputArray;
}

interface CustomersGroupedByProduct {
    productId: string;
    customerIds?: string[];
}
