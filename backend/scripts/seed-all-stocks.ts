import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.join(__dirname, '../data/seeds');

// ─── KRX 전종목: 세션 쿠키 획득 후 데이터 요청 ───
async function fetchKRXWithSession(mktId: string, cookies: string) {
  const res = await axios.post(
    'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd',
    new URLSearchParams({
      bld: 'dbms/MDC/STAT/standard/MDCSTAT01901',
      locale: 'ko_KR',
      mktId,
      trdDd: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      share: '1',
      money: '1',
      csvxls_is498: 'false',
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101',
        'Cookie': cookies,
      },
      timeout: 30000,
    }
  );
  return res.data.OutBlock_1 || [];
}

async function fetchKRStocksFromKRX() {
  console.log('Getting KRX session...');
  const session = await axios.get(
    'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101',
    {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      maxRedirects: 5,
    }
  );
  const cookies = (session.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');
  console.log('  Session obtained:', cookies ? 'yes' : 'no');

  console.log('Fetching KOSPI...');
  const kospi = await fetchKRXWithSession('STK', cookies);
  console.log(`  KOSPI: ${kospi.length} stocks`);

  console.log('Fetching KOSDAQ...');
  const kosdaq = await fetchKRXWithSession('KSQ', cookies);
  console.log(`  KOSDAQ: ${kosdaq.length} stocks`);

  const stocks = [
    ...kospi.map((s: any) => ({
      ticker: s.ISU_SRT_CD,
      name: s.ISU_ABBRV,
      nameEn: '',
      market: 'KOSPI',
      sector: s.SECT_TP_NM || '',
    })),
    ...kosdaq.map((s: any) => ({
      ticker: s.ISU_SRT_CD,
      name: s.ISU_ABBRV,
      nameEn: '',
      market: 'KOSDAQ',
      sector: s.SECT_TP_NM || '',
    })),
  ];

  return stocks.filter((s: any) => /^\d{6}$/.test(s.ticker));
}

// ─── Fallback: 네이버 금융 종목 리스트 ───
async function fetchKRStocksFromNaver() {
  console.log('Using Naver Finance fallback...');
  const stocks: any[] = [];

  for (const market of ['KOSPI', 'KOSDAQ']) {
    let page = 1;
    const pageSize = 100;
    while (true) {
      try {
        const res = await axios.get(
          `https://m.stock.naver.com/api/stocks/marketValue/${market}`,
          {
            params: { page, pageSize },
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );

        const items = res.data?.stocks || [];
        if (items.length === 0) break;

        for (const s of items) {
          stocks.push({
            ticker: s.stockCode || s.itemCode,
            name: s.stockName || s.itemName,
            nameEn: s.stockNameEng || '',
            market,
            sector: s.industryCodeName || '',
          });
        }

        console.log(`  ${market} page ${page}: ${items.length} stocks (total: ${stocks.length})`);
        if (items.length < pageSize) break;
        page++;
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        console.log(`  ${market} page ${page} failed: ${err.message}`);
        break;
      }
    }
  }

  return stocks.filter(s => /^\d{6}$/.test(s.ticker));
}

// ─── US 주요 종목 확장 리스트 ───
function getExpandedUSList() {
  return [
    { ticker: 'AAPL', name: 'Apple', nameEn: 'Apple Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'MSFT', name: 'Microsoft', nameEn: 'Microsoft Corporation', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'GOOGL', name: 'Alphabet A', nameEn: 'Alphabet Inc. Class A', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'GOOG', name: 'Alphabet C', nameEn: 'Alphabet Inc. Class C', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'AMZN', name: 'Amazon', nameEn: 'Amazon.com Inc.', market: 'NASDAQ', sector: 'Consumer' },
    { ticker: 'NVDA', name: 'NVIDIA', nameEn: 'NVIDIA Corporation', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'META', name: 'Meta Platforms', nameEn: 'Meta Platforms Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'TSLA', name: 'Tesla', nameEn: 'Tesla Inc.', market: 'NASDAQ', sector: 'Consumer' },
    { ticker: 'AVGO', name: 'Broadcom', nameEn: 'Broadcom Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'ADBE', name: 'Adobe', nameEn: 'Adobe Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'CRM', name: 'Salesforce', nameEn: 'Salesforce Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'AMD', name: 'AMD', nameEn: 'Advanced Micro Devices Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'INTC', name: 'Intel', nameEn: 'Intel Corporation', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'ORCL', name: 'Oracle', nameEn: 'Oracle Corporation', market: 'NYSE', sector: 'Technology' },
    { ticker: 'CSCO', name: 'Cisco', nameEn: 'Cisco Systems Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'NFLX', name: 'Netflix', nameEn: 'Netflix Inc.', market: 'NASDAQ', sector: 'Communication' },
    { ticker: 'QCOM', name: 'Qualcomm', nameEn: 'Qualcomm Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'TXN', name: 'Texas Instruments', nameEn: 'Texas Instruments Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'INTU', name: 'Intuit', nameEn: 'Intuit Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'AMAT', name: 'Applied Materials', nameEn: 'Applied Materials Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'MU', name: 'Micron', nameEn: 'Micron Technology Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'LRCX', name: 'Lam Research', nameEn: 'Lam Research Corporation', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'KLAC', name: 'KLA Corporation', nameEn: 'KLA Corporation', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'SNPS', name: 'Synopsys', nameEn: 'Synopsys Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'CDNS', name: 'Cadence Design', nameEn: 'Cadence Design Systems Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'NOW', name: 'ServiceNow', nameEn: 'ServiceNow Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'PANW', name: 'Palo Alto Networks', nameEn: 'Palo Alto Networks Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'CRWD', name: 'CrowdStrike', nameEn: 'CrowdStrike Holdings Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'SNOW', name: 'Snowflake', nameEn: 'Snowflake Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'PLTR', name: 'Palantir', nameEn: 'Palantir Technologies Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'SHOP', name: 'Shopify', nameEn: 'Shopify Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'UBER', name: 'Uber', nameEn: 'Uber Technologies Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'SQ', name: 'Block', nameEn: 'Block Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'COIN', name: 'Coinbase', nameEn: 'Coinbase Global Inc.', market: 'NASDAQ', sector: 'Financial' },
    { ticker: 'MRVL', name: 'Marvell Technology', nameEn: 'Marvell Technology Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'ARM', name: 'Arm Holdings', nameEn: 'Arm Holdings plc', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'SMCI', name: 'Super Micro Computer', nameEn: 'Super Micro Computer Inc.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'BRK.B', name: 'Berkshire Hathaway B', nameEn: 'Berkshire Hathaway Inc. Class B', market: 'NYSE', sector: 'Financial' },
    { ticker: 'JPM', name: 'JPMorgan Chase', nameEn: 'JPMorgan Chase & Co.', market: 'NYSE', sector: 'Financial' },
    { ticker: 'V', name: 'Visa', nameEn: 'Visa Inc.', market: 'NYSE', sector: 'Financial' },
    { ticker: 'MA', name: 'Mastercard', nameEn: 'Mastercard Inc.', market: 'NYSE', sector: 'Financial' },
    { ticker: 'BAC', name: 'Bank of America', nameEn: 'Bank of America Corporation', market: 'NYSE', sector: 'Financial' },
    { ticker: 'GS', name: 'Goldman Sachs', nameEn: 'The Goldman Sachs Group Inc.', market: 'NYSE', sector: 'Financial' },
    { ticker: 'MS', name: 'Morgan Stanley', nameEn: 'Morgan Stanley', market: 'NYSE', sector: 'Financial' },
    { ticker: 'PYPL', name: 'PayPal', nameEn: 'PayPal Holdings Inc.', market: 'NASDAQ', sector: 'Financial' },
    { ticker: 'C', name: 'Citigroup', nameEn: 'Citigroup Inc.', market: 'NYSE', sector: 'Financial' },
    { ticker: 'WFC', name: 'Wells Fargo', nameEn: 'Wells Fargo & Company', market: 'NYSE', sector: 'Financial' },
    { ticker: 'SCHW', name: 'Charles Schwab', nameEn: 'The Charles Schwab Corporation', market: 'NYSE', sector: 'Financial' },
    { ticker: 'BLK', name: 'BlackRock', nameEn: 'BlackRock Inc.', market: 'NYSE', sector: 'Financial' },
    { ticker: 'UNH', name: 'UnitedHealth', nameEn: 'UnitedHealth Group Inc.', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'JNJ', name: 'Johnson & Johnson', nameEn: 'Johnson & Johnson', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'LLY', name: 'Eli Lilly', nameEn: 'Eli Lilly and Company', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'ABBV', name: 'AbbVie', nameEn: 'AbbVie Inc.', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'MRK', name: 'Merck', nameEn: 'Merck & Co. Inc.', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'PFE', name: 'Pfizer', nameEn: 'Pfizer Inc.', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'NVO', name: 'Novo Nordisk', nameEn: 'Novo Nordisk A/S', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'TMO', name: 'Thermo Fisher', nameEn: 'Thermo Fisher Scientific Inc.', market: 'NYSE', sector: 'Healthcare' },
    { ticker: 'AMGN', name: 'Amgen', nameEn: 'Amgen Inc.', market: 'NASDAQ', sector: 'Healthcare' },
    { ticker: 'GILD', name: 'Gilead Sciences', nameEn: 'Gilead Sciences Inc.', market: 'NASDAQ', sector: 'Healthcare' },
    { ticker: 'ISRG', name: 'Intuitive Surgical', nameEn: 'Intuitive Surgical Inc.', market: 'NASDAQ', sector: 'Healthcare' },
    { ticker: 'WMT', name: 'Walmart', nameEn: 'Walmart Inc.', market: 'NYSE', sector: 'Consumer' },
    { ticker: 'COST', name: 'Costco', nameEn: 'Costco Wholesale Corporation', market: 'NASDAQ', sector: 'Consumer' },
    { ticker: 'PG', name: 'Procter & Gamble', nameEn: 'The Procter & Gamble Company', market: 'NYSE', sector: 'Consumer' },
    { ticker: 'KO', name: 'Coca-Cola', nameEn: 'The Coca-Cola Company', market: 'NYSE', sector: 'Consumer' },
    { ticker: 'PEP', name: 'PepsiCo', nameEn: 'PepsiCo Inc.', market: 'NASDAQ', sector: 'Consumer' },
    { ticker: 'MCD', name: "McDonald's", nameEn: "McDonald's Corporation", market: 'NYSE', sector: 'Consumer' },
    { ticker: 'NKE', name: 'Nike', nameEn: 'Nike Inc.', market: 'NYSE', sector: 'Consumer' },
    { ticker: 'SBUX', name: 'Starbucks', nameEn: 'Starbucks Corporation', market: 'NASDAQ', sector: 'Consumer' },
    { ticker: 'DIS', name: 'Walt Disney', nameEn: 'The Walt Disney Company', market: 'NYSE', sector: 'Communication' },
    { ticker: 'HD', name: 'Home Depot', nameEn: 'The Home Depot Inc.', market: 'NYSE', sector: 'Consumer' },
    { ticker: 'LOW', name: "Lowe's", nameEn: "Lowe's Companies Inc.", market: 'NYSE', sector: 'Consumer' },
    { ticker: 'TGT', name: 'Target', nameEn: 'Target Corporation', market: 'NYSE', sector: 'Consumer' },
    { ticker: 'BKNG', name: 'Booking Holdings', nameEn: 'Booking Holdings Inc.', market: 'NASDAQ', sector: 'Consumer' },
    { ticker: 'ABNB', name: 'Airbnb', nameEn: 'Airbnb Inc.', market: 'NASDAQ', sector: 'Consumer' },
    { ticker: 'XOM', name: 'Exxon Mobil', nameEn: 'Exxon Mobil Corporation', market: 'NYSE', sector: 'Energy' },
    { ticker: 'CVX', name: 'Chevron', nameEn: 'Chevron Corporation', market: 'NYSE', sector: 'Energy' },
    { ticker: 'COP', name: 'ConocoPhillips', nameEn: 'ConocoPhillips', market: 'NYSE', sector: 'Energy' },
    { ticker: 'CAT', name: 'Caterpillar', nameEn: 'Caterpillar Inc.', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'BA', name: 'Boeing', nameEn: 'The Boeing Company', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'GE', name: 'GE Aerospace', nameEn: 'GE Aerospace', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'HON', name: 'Honeywell', nameEn: 'Honeywell International Inc.', market: 'NASDAQ', sector: 'Industrial' },
    { ticker: 'UPS', name: 'UPS', nameEn: 'United Parcel Service Inc.', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'LMT', name: 'Lockheed Martin', nameEn: 'Lockheed Martin Corporation', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'RTX', name: 'RTX Corporation', nameEn: 'RTX Corporation', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'DE', name: 'Deere & Company', nameEn: 'Deere & Company', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'MMM', name: '3M', nameEn: '3M Company', market: 'NYSE', sector: 'Industrial' },
    { ticker: 'T', name: 'AT&T', nameEn: 'AT&T Inc.', market: 'NYSE', sector: 'Communication' },
    { ticker: 'VZ', name: 'Verizon', nameEn: 'Verizon Communications Inc.', market: 'NYSE', sector: 'Communication' },
    { ticker: 'TMUS', name: 'T-Mobile', nameEn: 'T-Mobile US Inc.', market: 'NASDAQ', sector: 'Communication' },
    { ticker: 'TSM', name: 'TSMC', nameEn: 'Taiwan Semiconductor Manufacturing', market: 'NYSE', sector: 'Technology' },
    { ticker: 'ASML', name: 'ASML', nameEn: 'ASML Holding N.V.', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'ON', name: 'ON Semiconductor', nameEn: 'ON Semiconductor Corporation', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'MSTR', name: 'MicroStrategy', nameEn: 'MicroStrategy Incorporated', market: 'NASDAQ', sector: 'Technology' },
    { ticker: 'DELL', name: 'Dell Technologies', nameEn: 'Dell Technologies Inc.', market: 'NYSE', sector: 'Technology' },
    { ticker: 'HPE', name: 'Hewlett Packard Enterprise', nameEn: 'Hewlett Packard Enterprise Company', market: 'NYSE', sector: 'Technology' },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF', nameEn: 'SPDR S&P 500 ETF Trust', market: 'NYSE', sector: 'ETF' },
    { ticker: 'QQQ', name: 'Invesco QQQ', nameEn: 'Invesco QQQ Trust', market: 'NASDAQ', sector: 'ETF' },
    { ticker: 'IWM', name: 'iShares Russell 2000', nameEn: 'iShares Russell 2000 ETF', market: 'NYSE', sector: 'ETF' },
    { ticker: 'SOXX', name: 'iShares Semiconductor', nameEn: 'iShares Semiconductor ETF', market: 'NASDAQ', sector: 'ETF' },
    { ticker: 'ARKK', name: 'ARK Innovation', nameEn: 'ARK Innovation ETF', market: 'NYSE', sector: 'ETF' },
    { ticker: 'VOO', name: 'Vanguard S&P 500', nameEn: 'Vanguard S&P 500 ETF', market: 'NYSE', sector: 'ETF' },
    { ticker: 'VTI', name: 'Vanguard Total Stock', nameEn: 'Vanguard Total Stock Market ETF', market: 'NYSE', sector: 'ETF' },
    { ticker: 'DIA', name: 'SPDR Dow Jones', nameEn: 'SPDR Dow Jones Industrial Average ETF', market: 'NYSE', sector: 'ETF' },
    { ticker: 'SOXL', name: 'Direxion Semiconductor Bull 3X', nameEn: 'Direxion Daily Semiconductor Bull 3X', market: 'NYSE', sector: 'ETF' },
    { ticker: 'TQQQ', name: 'ProShares UltraPro QQQ', nameEn: 'ProShares UltraPro QQQ', market: 'NASDAQ', sector: 'ETF' },
  ];
}

async function main() {
  try {
    // KR stocks: KRX first, Naver fallback
    let krStocks;
    try {
      krStocks = await fetchKRStocksFromKRX();
    } catch (err: any) {
      console.error('KRX fetch failed:', err.message);
      krStocks = await fetchKRStocksFromNaver();
    }

    const krPath = path.join(SEEDS_DIR, 'kr-stocks.json');
    fs.writeFileSync(krPath, JSON.stringify(krStocks, null, 2), 'utf-8');
    console.log(`\nSaved ${krStocks.length} KR stocks to kr-stocks.json`);

    // US stocks
    const usStocks = getExpandedUSList();
    const usPath = path.join(SEEDS_DIR, 'us-stocks.json');
    fs.writeFileSync(usPath, JSON.stringify(usStocks, null, 2), 'utf-8');
    console.log(`Saved ${usStocks.length} US stocks to us-stocks.json`);

    console.log('\nDone! Restart the backend server to re-seed the database.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
