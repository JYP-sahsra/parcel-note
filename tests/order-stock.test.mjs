import {test} from 'node:test';
import assert from 'node:assert/strict';
import order from '../orders.js';
const {stockFor,carriers,demoPrice,snapshots}=order;
test('either order selects all current stock for its owner exactly once',()=>{const a=stockFor('DEMO-1001');assert.deepEqual(a,stockFor(' demo-1002 '));assert.deepEqual([a.units,a.boxes.length,a.orderCount],[6,2,2]);assert.equal(stockFor('DEMO-1001',[...snapshots].reverse()).units,6);});
test('owner isolation and empty vs unavailable',()=>{assert.equal(stockFor('DEMO-2001').units,5);assert.equal(stockFor('DEMO-3001').units,0);assert.equal(stockFor('real-number'),null);});
test('regional carrier selection',()=>{for(const [cc,list] of Object.entries({US:['YUN','FEDEX'],JP:['MIR'],TW:['IDO'],HK:['IDO'],MO:['IDO'],CA:['FEDEX'],BR:['FEDEX']}))assert.deepEqual(carriers(cc),list);});
test('individual boxes rated before summing and US local costs separate',()=>{const b=stockFor('DEMO-1001').boxes;const yun=demoPrice('US','YUN',b), fed=demoPrice('US','FEDEX',b);assert.equal(yun.local,null);assert.equal(fed.local,13);assert.equal(fed.freight,fed.details.reduce((s,v)=>s+v.cost,0));assert.equal(fed.total,fed.freight+fed.local);assert.equal(fed.weight,4.5);assert.equal(demoPrice('TW','IDO',b).total,42000);});
test('no price when zone, dimensions or declared value are missing',()=>{const b=stockFor('DEMO-1001').boxes;assert.equal(demoPrice('ZZ','FEDEX',b).reason,'unmapped');assert.equal(demoPrice('US','FEDEX',[{...b[0],cm:null}]).reason,'weightMissing');assert.equal(demoPrice('US','FEDEX',[{...b[0],value:null}]).reason,'valueMissing');assert.equal(demoPrice('JP','YUN',b).reason,'unavailable');});
