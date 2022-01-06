/*
  문제가 맞았다면 문제 관련 데이터를 파싱하는 함수의 모음입니다.
  모든 해당 파일의 모든 함수는 findData()를 통해 호출됩니다.
*/

/*
  bojData를 초기화하는 함수로 문제 요약과 코드를 파싱합니다.

  - 문제 설명: problemDescription
  - Github repo에 저장될 디렉토리: directory
  - 커밋 메시지: message 
  - 백준 문제 카테고리: category
  - 파일명: fileName
  - Readme 내용 : readme
*/
async function findData() {
  const bojData = {
    // Meta data of problem
    meta: {
      title: '',
      problemId: '',
      level: '',
      problemDescription: '',
      language: '',
      message: '',
      fileName: '',
      category: '',
      readme: '',
      directory: '',
    },
    submission: {
      submissionId: '',
      code: '',
      memory: '',
      runtime: '',
    },
  };

  try {
    const { 
      username, 
      result, 
      memory, 
      runtime, 
      language, 
      submissionTime, 
      submissionId, 
      problemId 
    } = findFromResultTable();
    const {
      title, 
      level, 
      code,
      tags,
      problem_description, 
      problem_input, 
      problem_output 
    } = await findProblemDetailsAndSubmissionCode(problemId, submissionId);
    const problemDescription = `### 문제 설명\n\n${problem_description}\n\n`
                            + `### 입력 \n\n ${problem_input}\n\n`
                            + `### 출력 \n\n ${problem_output}\n\n`;
    const directory = `백준/${level.replace(/ .*/, '')}/${problemId}.${title.replace(/\s+/g, '-').replace(titleRegex, '')}`;
    const message = `[${level}] Title: ${title}, Time: ${runtime} ms, Memory: ${memory} KB -BaekjoonHub`;
    const tagl = [];
    tags.forEach((tag) => tagl.push(`${categories[tag.key]}(${tag.key})`));
    const category = tagl.join(', ');
    const fileName = title.replace(/\s+/g, '-').replace(titleRegex, '') + languages[language];
    const readme = `# [${level}] ${title} - ${problemId} \n\n` 
                + `[문제 링크](https://www.acmicpc.net/problem/${problemId}) \n\n`
                + `### 성능 요약\n\n`
                + `메모리: ${memory} KB, `
                + `시간: ${runtime} ms\n\n`
                + `### 분류\n\n`
                + `${category}\n\n`
                + `${problemDescription}\n\n`;
    return {
      meta: {
        title,
        problemId,
        level,
        problemDescription,
        language,
        message,
        fileName,
        category,
        readme,
        directory,
      },
      submission: {
        submissionId,
        code,
        memory,
        runtime,
      },
    };
  } catch (error) {
    console.error(error);
  }
  return bojData;
}

function findUsername() {
  return document.querySelector('a.username').innerText;
}

function isExistResultTable() {
  return document.getElementById('status-table') !== null;
}

function findResultTableList() {
  const table = document.getElementById('status-table');
  if (table === null || table === undefined || table.length === 0) return [];
  const headers = Array.from(table.rows[0].cells, (x) => convertResultTableHeader(x.innerText.trim()));

  const list = [];
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const cells = Array.from(row.cells, (x, index) => {
      switch (headers[index]) {
        case 'language':
          return x.innerText.unescapeHtml().replace(/\/.*$/g, '').trim();
        case 'submissionTime':
          return x.firstChild.getAttribute('data-original-title');
        default:
          return x.innerText.trim();
      }
    });
    const obj = {};
    obj.element = row;
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cells[j];
    }
    list.push(obj);
  }
  if (debug) console.log('TableList', list);
  return list;
}

/*
  제출 화면의 데이터를 파싱하는 함수로 다음 데이터를 확인합니다.
    - 유저이름: username
    - 실행결과: result
    - 메모리: memory
    - 실행시간: runtime
    - 제출언어: language
    - 제출시간: submissionTime
    - 제출번호: submissionId
    - 문제번호: problemId
    - 해당html요소 : element
*/
function findFromResultTable() {
  if (!isExistResultTable()) {
    if (debug) console.log('Result table not found');
  }
  const resultList = findResultTableList();
  if (resultList.length === 0) return;
  const row = resultList[0];
  return row;
}

/*
  Fetch를 사용하여 정보를 구하는 함수로 다음 정보를 확인합니다.

    - 문제 설명: problem_description
    - 문제 입력값: problem_input
    - 문제 출력값: problem_output
    - 제출 코드: code
    - 문제 제목: title
    - 문제 등급: level 
    - Github repo에 저장될 디렉토리: directory
    - 커밋 메시지: message 
    - 백준 문제 카테고리: category
*/

async function findProblemDetailsAndSubmissionCode(problemId, submissionId) {

  if (checkElem(problemId) && checkElem(submissionId)) {
    const DescriptionParse = fetch(`https://www.acmicpc.net/problem/${problemId}`, { method: 'GET' });
    const CodeParse = fetch(`https://www.acmicpc.net/source/download/${submissionId}`, { method: 'GET' });
    const SolvedAPI = fetch(`https://solved.ac/api/v3/problem/show?problemId=${problemId}`, { method: 'GET' });
    return Promise.all([DescriptionParse, CodeParse, SolvedAPI])
      .then(([despResponse, codeResponse, solvedResponse]) => Promise.all([despResponse.text(), codeResponse.text(), solvedResponse.json()]))
      .then(([descriptionText, codeText, solvedJson]) => {
        /* Get Question Description */
        const parser = new DOMParser();
        const doc = parser.parseFromString(descriptionText, 'text/html');
        let problem_description;
        let problem_input;
        let problem_output;
        if (doc != null) {
          problem_description = `${unescapeHtml(doc.getElementById('problem_description').innerHTML.trim())}`;
          problem_input =       `${unescapeHtml(doc.getElementById('problem_input').innerHTML.trim())}`;
          problem_output =      `${unescapeHtml(doc.getElementById('problem_output').innerHTML.trim())}`;
        }
        /* Get Code */
        const code = codeText;
        /* Get Solved Response */
        const { tags } = solvedJson;
        const title = solvedJson.titleKo;
        const level = bj_level[solvedJson.level];
        return { problemId, submissionId, title, level, tags, code, problem_description, problem_input, problem_output };
      });
    // .catch((err) => {
    //   console.log('error ocurred: ', err);
    //   uploadState.uploading = false;
    //   markUploadFailedCSS();
    // });
  }
}

/* Since we dont yet have callbacks/promises that helps to find out if things went bad */
/* we will start 10 seconds counter and even after that upload is not complete, then we conclude its failed */
function startUploadCountDown() {
  uploadState.uploading = true;
  uploadState.countdown = setTimeout(() => {
    if (uploadState.uploading === true) {
      // still uploading, then it failed
      uploadState.uploading = false;
      markUploadFailedCSS();
    }
  }, 10000);
}
