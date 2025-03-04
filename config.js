require('dotenv').config();

const WHITELISTED_DIDS = [
    // {
    //     did: "did:ssid:qafenn5",
    //     mnemonics: "tube mountain grow multiply also candy coach van sheriff exile science future",
    //     token: "eyJhbGciOiJlZDI1NTE5IiwidHlwIjoiTVdUIn0=:eyJlbWFpbCI6InFhZmVubjVAeW9wbWFpbC5jb20iLCJ1aWQiOiJlMWQ0NGY0ZS01YzJmLTRhMWEtOWZhZi1lMmRjYzU5YTgyYWUiLCJ1c2VyX2RpZCI6IjB4NjQ2OTY0M2E3MzczNjk2NDNhNzE2MTY2NjU2ZTZlMzUwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCIsInVzZXJfcHVibGljX2tleSI6IjB4MzhkZGYwNWUwZTFkMGM0MDYxNjZmOWMwZDBhNjE3YTRiNTZhNjUwMjhkMmI1ZDA1MzhlZDRmZGI5MGRkMzcwMCIsInRhcmdldF9kaWQiOiJkaWQ6c3NpZDptZXRhbXVpX2JhY2tlbmQiLCJ1c2VyX3JvbGUiOiJVc2VyIiwibWV0YWRhdGEiOiIiLCJhcHBfaWQiOiJNTVVJU1NJRCIsImlzc3VlZF9hdCI6IjE3Mjg4ODQzNjciLCJleHBpcnkiOiIzMzM1OTI0MzY3In0=:MHhkMTYyYWI3NGQ2NjMzMzNjZTdiZjdmMGIwYjVjMWUwMzAzYWNkYThlOThjYTIxMDA2MTAwMWRmY2ExYjNkZTA1Zjk3ZjkzMDU3NzA0ODUyYjY5ZDM4OWNkOWVkYmY5YzczMWI4MTM4M2IwNzZkZTg5OGI4NDM5MmU4YzdjMDEwOQ==",
    //     app_id: "MMUISSID"
    // }, {
    //     did: 'did:ssid:manika',
    //     mnemonics: 'vibrant man mobile develop much oxygen lesson capable omit view steel want',
    //     token: "eyJhbGciOiJlZDI1NTE5IiwidHlwIjoiTVdUIn0=:eyJlbWFpbCI6Im1hbmlrYUBtYWlsc2FjLmNvbSIsInVpZCI6IjdhMzIwYWY2LTg0OTAtNDI0YS05ZGYzLTY4YjQxMDhhMmY0NSIsInVzZXJfZGlkIjoiMHg2NDY5NjQzYTczNzM2OTY0M2E2ZDYxNmU2OTZiNjEwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIiwidXNlcl9wdWJsaWNfa2V5IjoiMHg1ZWQzM2Q5N2ZkZDk3M2VlMTczMTdlNzIwNWU4MmIwM2QxMmZmM2JkZDRhYTRiOTNhYTE2MDY2NWUwMjFkODc3IiwidGFyZ2V0X2RpZCI6ImRpZDpzc2lkOm1ldGFtdWlfYmFja2VuZCIsInVzZXJfcm9sZSI6IlVzZXIiLCJtZXRhZGF0YSI6IntcInVzZXJfdHlwZVwiOlwiSU5ESVZJRFVBTFwifSIsImFwcF9pZCI6IkNPMiIsImlzc3VlZF9hdCI6IjE3Mjg4ODQzNjgiLCJleHBpcnkiOiIzMzM1OTI0MzY4In0=:MHhjMmUwNTVkZWFmNjA5ZjY2ZmViZjA1Y2JmYzJkMmUyYzM2MzRmMzgzOWIyM2YxMjkyNTAxMDQ3NzA3MzAyZWZjZTU1NTY4Y2MyODFhMzE2ZjM2OWM3NWI2MGE4NmNhN2EwMGJiMGRjYTYyNzA4Y2MwNWViYjAwNzkzZGUyNDkwNQ==",
    //     app_id: "CO2"
    // }, {
    //     did: 'did:co2network:milana',
    //     mnemonics: 'pyramid gauge song quote symptom pottery solve tube fit window tennis fault',
    //     token: "eyJhbGciOiJlZDI1NTE5IiwidHlwIjoiTVdUIn0=:eyJlbWFpbCI6InByb2tldmludSs3MUBnbWFpbC5jb20iLCJ1aWQiOiI3ZDNlNjA5ZC1iNGIzLTQwMTUtYmEwNC1mYzEwZDkyYjc0ZDQiLCJ1c2VyX2RpZCI6IjB4NjQ2OTY0M2E2MzZmMzI2ZTY1NzQ3NzZmNzI2YjNhNmQ2OTZjNjE2ZTYxMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCIsInVzZXJfcHVibGljX2tleSI6IjB4YTJkZTQyZjJhNTljOTg0NjM4ZWM0YjAzNTBjMDM0NzIxNzk2NWQ3YjVjYWMxYjg2NmVjMDI3ZDg1MjA5NDgzMiIsInRhcmdldF9kaWQiOiJkaWQ6c3NpZDptZXRhbXVpX2JhY2tlbmQiLCJ1c2VyX3JvbGUiOiJVc2VyIiwibWV0YWRhdGEiOiJ7XCJpc01pZ3JhdGVkXCI6dHJ1ZSxcInVzZXJfdHlwZVwiOlwiSU5ESVZJRFVBTFwifSIsImFwcF9pZCI6IkNPMiIsImlzc3VlZF9hdCI6IjE3Mjg4ODQzNjgiLCJleHBpcnkiOiIzMzM1OTI0MzY4In0=:MHhlNmVjZjNmNzZiZTBiYzM4MDE3Y2ZjNTBhYzNmYzE1YTkyNzg0YzA4NTRmODJlZmM1NjhiZTM1YzViN2I5NWJlZGJhZDg1Yzc3MjM3NzFiNjg0ZWE5Nzk4YjQxYjVjZDMwZGI3Zjk4YzljZmY5MDJmODZkMWRiODUzN2I3OWUwZA==",
    //     app_id: "CO2"
    // }, {
    //     did: "did:unzn:kevinu",
    //     mnemonics: "mix they trophy dwarf submit despair chimney twice wide useless leaf hospital",
    //     token: "eyJhbGciOiJlZDI1NTE5IiwidHlwIjoiTVdUIn0=:eyJlbWFpbCI6InByb2tldmludUBnbWFpbC5jb20iLCJ1aWQiOiIyNjA1ODdmOS05YWQ4LTRhYmEtODU3MC04YzI1Njc2ZjM5NDIiLCJ1c2VyX2RpZCI6IjB4NjQ2OTY0M2E3NTZlN2E2ZTNhNmI2NTc2Njk2ZTc1MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCIsInVzZXJfcHVibGljX2tleSI6IjB4MDhkMTIzNjIxZjgwYThkMmE3MjU3NGUwYzM0ZjFlMTI5MDAyM2M2MDZkM2E3MTBkYmU0ZjQzMjkxMTc3ZGQ3ZSIsInRhcmdldF9kaWQiOiJkaWQ6c3NpZDptZXRhbXVpX2JhY2tlbmQiLCJ1c2VyX3JvbGUiOiJVc2VyIiwibWV0YWRhdGEiOiJ7XCJ1c2VyX3R5cGVcIjpcIklORElWSURVQUxcIn0iLCJhcHBfaWQiOiJDTzIiLCJpc3N1ZWRfYXQiOiIxNzI4ODg0MzY4IiwiZXhwaXJ5IjoiMzMzNTkyNDM2OCJ9:MHgxZjcyM2U2ODFmNjkzYmFlZGViMjg4YTNmYTU2MjI0NTBkMDQ3NDI3YjJkMjc2YTIzZTkwNDkxMDM1NDk3MTA3ODJmNDJiMDg5YzZmYmRmZDZmMWNlMjVlMGE0OWY5NDRjNzRhMTIwNmIxNjk2MTNjNTNkMzEyOGFkMzBmOGQwOA==",
    //     app_id: "CO2"
    //     },
    {
        did: "did:ssid:sama",
        mnemonics: process.env.DID_SAMA_MNEMONICS || "",
        token: process.env.DID_SAMA_TOKEN || "",
        app_id: "SWNWALT",
        domain_id: "birrigubba"
    },
    {
        did: "did:birrigubba:john",
        mnemonics: process.env.DID_JOHN_BIRRIGUBBA_MNEMONICS || "",
        token: process.env.DID_JOHN_BIRRIGUBBA_TOKEN || "",
        app_id: "SWNWALT",
        domain_id: "birrigubba"
    },
    {
        did: "did:birrigubba:jacob",
        mnemonics: process.env.DID_JACOB_MNEMONICS || "",
        token: process.env.DID_JACOB_TOKEN || "",
        app_id: "SWNWALT",
        domain_id: "birrigubba"
    },
    {
        did: "did:birrigubba:james",
        mnemonics: process.env.DID_JAMES_MNEMONICS || "",
        token: process.env.DID_JAMES_TOKEN || "",
        app_id: "SWNWALT",
        domain_id: "birrigubba"
    },
    {
        did: "did:birrigubba:mahavir",
        mnemonics: process.env.DID_MAHAVIR_MNEMONICS || "",
        token: process.env.DID_MAHAVIR_TOKEN || "",
        app_id: "SWNWALT",
        domain_id: "birrigubba"
    },
    {
        did: "did:ssid:sumeet",
        mnemonics: process.env.DID_SUMEET_MNEMONICS || "",
        token: process.env.DID_SUMEET_TOKEN || "",
        app_id: "MMUISSID",
        domain_id: "birrigubba"
    },
    {
        did: "did:ssid:john",
        mnemonics: process.env.DID_JOHN_SSID_MNEMONICS || "",
        token: process.env.DID_JOHN_SSID_TOKEN || "",
        app_id: "MMUISSID",
        domain_id: "metamui"
    },
    {
        did: "did:ssid:john",
        mnemonics: process.env.DID_JOHN_METAMUI_MNEMONICS || "",
        token: process.env.DID_JOHN_METAMUI_TOKEN || "",
        app_id: "MMUISSID",
        domain_id: "metamui"
    },
    {
        did: "did:ssid:jacob",
        mnemonics: process.env.DID_JACOB_METAMUI_MNEMONICS || "",
        token: process.env.DID_JACOB_METAMUI_TOKEN || "",
        app_id: "MMUISSID",
        domain_id: "metamui"
    }

];
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL;
const DID_COMM_SERVER_URL = process.env.DID_COMM_SERVER_URL;
const ISSUER_DID = process.env.ISSUER_DID;
const ISSUER_MNEMONICS = process.env.ISSUER_MNEMONICS;
const SUDO_MNEMONICS = process.env.SUDO_MNEMONICS;


module.exports = {
    WHITELISTED_DIDS,
    AUTH_SERVER_URL,
    DID_COMM_SERVER_URL,
    ISSUER_DID,
    ISSUER_MNEMONICS,
    SUDO_MNEMONICS
}