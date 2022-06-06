const {
    sqlForPartialUpdate
} = require("./sql");
const {
    BadRequestError
} = require("../expressError");

describe("sqlForPartialUpdate function", () => {
    test("1 input", () => {
        const res = sqlForPartialUpdate({
            field1: "newVal"
        }, {
            field1: "field1"
        });
        expect(res).toEqual({
            setCols: "\"field1\"=$1",
            values: ["newVal"],
        });
    });

    test("2 inputs", () => {
        const res = sqlForPartialUpdate({
            field1: "newVal1",
            field2: "newVal2"
        }, {
            field2: "field2"
        });
        expect(res).toEqual({
            setCols: "\"field1\"=$1, \"field2\"=$2",
            values: ["newVal1", "newVal2"],
        });
    });

    test("Error if no data is found", () => {
        try {
            const res = sqlForPartialUpdate({
                col1: ""
            }, {
                col1: ""
            });
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }

    })
});