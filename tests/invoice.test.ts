import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { invoiceBytes } from '../lib/invoice';
import { sampleOrders } from '../lib/admin';
test('Invoice PDF supports a normal order and paginates long carts',async()=>{const order=sampleOrders()[0];const short=await PDFDocument.load(await invoiceBytes(order,undefined,true));assert.equal(short.getPageCount(),1);const long={...order,items:Array.from({length:30},(_,i)=>({...order.items[0],name:`Traditional favorite ${i} with a carefully prepared family recipe`,quantity:2})),total:10800};const document=await PDFDocument.load(await invoiceBytes(long));assert.ok(document.getPageCount()>1);for(const p of document.getPages())assert.equal(Math.round(p.getHeight()),842)});
