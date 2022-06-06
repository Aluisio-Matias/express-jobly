"use strict";

const res = require("express/lib/response");
const db = require("../db");
const {
    NotFoundError
} = require("../expressError");
const {
    sqlForPartialUpdate
} = require("../helpers/sql");

class Job {
    /** Create a job (from data), 
     * @param data, update db, return new job data.
     *
     * @example data should be { title, salary, equity, companyHandle }
     *
     * @returns { id, title, salary, equity, companyHandle }
     **/

    static async create(data) {
        const result = await db.query(
            `INSERT INTO jobs 
                        (title,
                        salary,
                        equity,
                        company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
            [data.title, data.salary, data.equity, data.companyHandle, ]);
        let job = result.rows[0];
        return job;
    };


    /** Find all jobs (optional filter on searchFilters).
     *
     * searchFilters (all optional):
     * @param minSalary (will find the minimum salary company offers)
     * @param hasEquity (true returns only jobs with equity > 0, other values ignored)
     * @param title (will find case-insensitive, partial matches)
     *
     * @returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
     * */

    static async findAll({
        minSalary,
        hasEquity,
        title
    } = {}) {
        let query = `SELECT j.id, 
                            j.title,
                            j.salary,
                            j.equity,
                            j.company_handle AS "companyHandle",
                            c.name AS "companyName"
                    FROM jobs j
                    LEFT JOIN companies AS c ON c.handle = j.company_handle`;
        let whereExpressions = [];
        let queryValues = [];

        // For every possible search term, add to whereExpressions 
        // queryValues will generate the right SQL

        /**title: filter by job title. This should be a case-insensitive, 
         * matches-any-part-of-string search. */
        if (title !== undefined) {
            queryValues.push(`%${title}%`);
            whereExpressions.push(`title ILIKE $${queryValues.length}`);
        }

        /**minSalary: filter to jobs with at least that salary. */
        if (minSalary !== undefined) {
            queryValues.push(minSalary);
            whereExpressions.push(`salary >= $${queryValues.length}`);
        }

        /**hasEquity: if true, filter to jobs that provide a non-zero amount of equity. 
         * If false or not included in the filtering, list all jobs regardless of equity. */
        if (hasEquity === true) {
            whereExpressions.push(`equity > 0`);
        }

        if (whereExpressions.length > 0) {
            query += " WHERE " + whereExpressions.join(" AND ");
        }

        //Last finalize the query and return the results
        query += " ORDER BY title";
        const jobsRes = await db.query(query, queryValues);
        return jobsRes.rows;
    };


    /** Given a job id, 
     * @param id return data about job.
     * @returns { id, title, salary, equity, companyHandle, company }
     *   where company is { handle, name, description, numEmployees, logoUrl }
     *
     * Throws NotFoundError if not found.
     **/

    static async get(id) {
        const jobRes = await db.query(
            `SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs WHERE id = $1`, [id]);

        const job = jobRes.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id} was found!`);

        const companiesRes = await db.query(
            `SELECT handle, 
                name, 
                description, 
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
            FROM companies
            WHERE handle = $1`, [job.companyHandle]);

        delete job.companyHandle;
        job.company = companiesRes.rows[0];

        return job;
    };

    /** Update job data with `data`.
     * 
     * This is a "partial update" --- it doesn't have contain
     * all the data fields; this only changes provided field.
     *
     * @example Data can include: { title, salary, equity }
     *
     * @returns { id, title, salary, equity, companyHandle }
     *
     * Throws NotFoundError if not found.
     */

    static async update(id, data) {
        const {
            setCols,
            values
        } = sqlForPartialUpdate(data, {});

        const idVarIdx = "$" + (values.length + 1);

        const query = `UPDATE jobs SET ${setCols}
                        WHERE id = ${idVarIdx}
                        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;

        const result = await db.query(query, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id} was found!`);

        return job;
    };


    /** Delete a given job from the database selected by the id; returns undefined.
     *
     * Throws NotFoundError if company is not found.
     **/

    static async remove(id) {
        const result = await db.query(
            `DELETE FROM jobs
            WHERE id = $1
            RETURNING id`, [id]);

        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${id} was found!`);
    };

};

module.exports = Job;