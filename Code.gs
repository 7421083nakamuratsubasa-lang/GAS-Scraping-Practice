
const TARGET_URL = 'https://7421083nakamuratsubasa-lang.github.io/GAS-Scraping-Practice/';

/**
 * 指定したURLからHTMLのテキストを取得する関数
 */
function fetchHtmlContent() {
  try {
    // UrlFetchAppサービスを使って外部URLにアクセス
    const response = UrlFetchApp.fetch(TARGET_URL);
    
    // レスポンスからHTMLコンテンツ（テキスト）を取得
    const htmlContent = response.getContentText('UTF-8');
    
    // 取得したHTMLをログに出力（確認用）
    Logger.log('HTML取得に成功しました。コンテンツの長さ: ' + htmlContent.length);
    
    // 取得したHTMLテキストを返す
    return htmlContent;
    
  } catch (e) {
    // エラー処理
    Logger.log('HTMLの取得中にエラーが発生しました: ' + e.toString());
    return null;
  }
}

/**
 * 取得したHTMLコンテンツからニュース記事の情報を抽出する関数
 * @param {string} htmlContent - fetchHtmlContent() で取得したHTML文字列
 * @returns {Array<Array<string>>} - [タイトル, 日付, ID] の配列の配列
 */
function extractNewsData(htmlContent) {
  if (!htmlContent) {
    Logger.log("HTMLコンテンツが空のため、抽出をスキップします。");
    return [];
  }

  // 抽出結果を格納する配列
  const results = [];
  
  // 正規表現パターンを定義
  // 抽出したい記事（<li class="news-item" ...> ... </li>）全体をターゲット
  // 正規表現でデータを取り出す部分を () で囲う
  
  // パターンの解説:
  // <li[^>]*?data-id="([0-9]+?)"> -> data-id="1001" の 1001 (ユニークID) を抽出
  // <div class="news-title">([^<]+?)</div> -> タイトルを抽出
  // <span class="date">([^<]+?)</span> -> 日付を抽出
  // [\s\S]*? は、その間の全ての文字（改行含む）を最小限のマッチで捉えるための表現
  const regex = /<li[^>]*?data-id="([0-9]+?)">[\s\S]*?<div class="news-title">([^<]+?)<\/div>[\s\S]*?<span class="date">([^<]+?)<\/span>/g;
  
  let match;
  
  // match = regex.exec(htmlContent) は、マッチする部分を一つずつ見つけてくれる
  while ((match = regex.exec(htmlContent)) !== null) {
    // match[1] が最初の () で囲まれた部分 (ID)
    // match[2] が2番目の () で囲まれた部分 (タイトル)
    // match[3] が3番目の () で囲まれた部分 (日付)
    
    const id = match[1];
    const title = match[2];
    const date = match[3];
    
    // 抽出したデータを配列に追加
    results.push([title, date, id]);
    
    Logger.log('抽出データ: ID=' + id + ', Title=' + title);
  }
  
  return results;
}

/**
 * 抽出データをスプレッドシートに書き込む関数（重複チェック付き）
 * @param {Array<Array<string>>} data - [タイトル, 日付, ID] の配列
 */
function writeDataToSheet(data) {
  // 1. スプレッドシートとシートの取得
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'ニュースデータ'; // 記録用のシート名
  let sheet = ss.getSheetByName(sheetName);
  
  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // ヘッダー行の追加
    sheet.appendRow(['タイトル', '日付', 'ユニークID']);
    Logger.log(`新しいシート '${sheetName}' を作成しました。`);
  }
  
  // 2. 既存データの取得と重複チェック用セットの作成
  // ID（3列目）を重複チェックのキーとして使用
  const lastRow = sheet.getLastRow();
  let existingIds = new Set();
  
  if (lastRow > 1) { // ヘッダー行 (1行目) よりデータがある場合
    // IDが格納されている3列目のデータを全て取得
    const idRange = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
    idRange.forEach(row => existingIds.add(String(row[0])));
  }
  
  // 3. 新規データのみをフィルタリング
  const newDataToWrite = [];
  let newRecordsCount = 0;
  
  data.forEach(row => {
    const id = String(row[2]); // 3番目の要素 (ID)
    
    // SetにIDが存在しない（＝新規）の場合のみ、書き込みリストに追加
    if (!existingIds.has(id)) {
      newDataToWrite.push(row);
      newRecordsCount++;
    }
  });

  // 4. 新規データをシートにまとめて書き込み
  if (newDataToWrite.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newDataToWrite.length, newDataToWrite[0].length).setValues(newDataToWrite);
    Logger.log(`${newRecordsCount} 件の新規記事をスプレッドシートに書き込みました。`);
  } else {
    Logger.log('新規に書き込むデータはありませんでした。');
  }
}

/**
 * 処理全体を実行するメイン関数 
 */
function mainScraper() {
  Logger.log('--- スクレイピング処理開始 ---');
  
  // 1. HTMLコンテンツの取得
  const html = fetchHtmlContent();
  
  if (html) {
    // 2. データの抽出
    const extractedData = extractNewsData(html);
    
    if (extractedData.length > 0) {
      Logger.log('抽出された記事の総数: ' + extractedData.length);
      
      // 3. スプレッドシートへの書き込み (新規に追加)
      writeDataToSheet(extractedData);
      
    } else {
      Logger.log('抽出できる記事が見つかりませんでした。');
    }
  }
  Logger.log('--- スクレイピング処理終了 ---');
}
