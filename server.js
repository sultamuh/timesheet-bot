const dotenv = require('dotenv').config();
const fs = require('fs').promises;
const puppeteer = require('puppeteer');

const url = 'http://jira.edisoft.com:8080/secure/Tempo.jspa';

const getFileDate = () => {
  let now = Date.now();
  let date = new Date(now);
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  let today = `${year}${month}${day}`;
  return today;
};

const readFile = async () => {
  const file = `./TimeData_${getFileDate()}`;
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.log(err.message);
  }
};

const getData = async () => {
  const data = await readFile();
  const result = data.map((x) => {
    return {
      name: x.Name,
      details: x.Details,
      duration: x.DurationHours,
    };
  });
  return result;
};

const initBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto(url);
  return page;
};

const login = async () => {
  const page = await initBrowser();
  try {
    await page.waitForSelector('input[name="os_username"]');
    await page.waitForSelector('input[name="os_password"]');
    await page.waitForSelector('input[name="login"]');
    await page.type('input[name=os_username]', process.env.USERNAME);
    await page.type('input[name=os_password]', process.env.PASSWORD);
    await page.click('input[name="login"]');

    const timesheetData = await getData();
    for (let i = 0; i < timesheetData.length; i++) {
      loadTimesheetPopup(
        page,
        timesheetData[i].name,
        timesheetData[i].details,
        timesheetData[i].duration
      );
      await page.waitForTimeout(16000);
    }
    console.log('Your timesheet has been filled successfully!');
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

const loadTimesheetPopup = async (page, name, details, duration) => {
  try {
    await page.waitForTimeout(5000);

    await page.waitForSelector('button[name="logWorkButton"]');
    await page.click('button[name="logWorkButton"]');

    await page.waitForTimeout(1000);

    await page.waitForSelector('input[id="issuePickerInput"]');
    await page.type('input[id="issuePickerInput"]', name);

    await page.waitForTimeout(1000);

    await page.waitForSelector('div.sc-ksYbfQ.sc-hmzhuo.cpvrJh');
    await page.click('div.sc-ksYbfQ.sc-hmzhuo.cpvrJh');

    await page.waitForTimeout(1000);

    await page.waitForSelector('textarea[id="comment"]');
    await page.type('textarea[id="comment"]', details);

    await page.waitForTimeout(1000);

    await page.waitForSelector('input[id="timeSpentSeconds"]');
    await page.type('input[id="timeSpentSeconds"]', JSON.stringify(duration));

    if (name.slice(0, 3) !== 'INT') {
      await page.waitForTimeout(1000);
      await page.waitForSelector('input[id="timeSpentSeconds"]');
      await page.type('input[id="billable"]', '0h');
    }

    await page.waitForTimeout(1000);

    await page.click('button[name="submitWorklogButton"]');
  } catch (err) {
    console.log(err.message);
  }
};

const run = () => {
  login();
};

run();
