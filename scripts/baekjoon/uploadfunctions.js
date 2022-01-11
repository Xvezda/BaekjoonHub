/* Github 업로드 메인 함수 */
/* 모든 업로드는 uploadGit 함수로 합니다.  파라미터는 아래와 같습니다. */
/*  
    code: 업로드하는 파일 내용
    problemName: 업로드하는 파일의 디렉토리
    fileName: 업로드하는 파일 명
    type: CommitType의 readme or code
    cb: Callback 함수(업로드 후 로딩 아이콘 처리를 맡는다
*/
async function uploadGit(code, directory, fileName, type, cb = undefined, bojData) {
  /* Get necessary payload data */
  const token = await getToken();
  if (debug) console.log('token', token);
  const mode = await getModeType();
  if (mode === 'commit') {
    /* Local Storage에 저장된 Github Repository(hook) 주소를 찾습니다 */
    const hook = await getHook();

    /* 현재 업로드되어 있는 코드가 있다면 해당 코드의 SHA를 구합니다. */
    const filePath = bojData.meta.problemId + bojData.meta.problemId + bojData.meta.language;
    const stats = await getStats();

    let sha = null;
    if (stats !== undefined && stats.submission !== undefined && stats.submission[filePath] !== undefined) {
      sha = stats.submission[filePath][type];
    }

    return upload(token, hook, code, directory, fileName, type, sha, cb, bojData);
  }
}

/* Github 업로드 함수 */
/* Github api를 사용하여 업로드를 합니다. 참고 링크 https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents */
/* 함수 파라미터는 아래와 같습니다.
    token: local storage에 있는 Github Token
    hook: 등록된 Github Repository
    code: Github에 푸시할 파일 내용
    directory: 업로드할 파일 디렉토리
    filename: 업로드할 파일명
    type: CommitType의 readme or code
    sha: 현재 업로드된 파일의 SHA
    cb: Callback 함수(업로드 후 로딩 아이콘 처리를 맡는다
*/
function upload(token, hook, code, directory, filename, type, sha, cb = undefined, bojData) {
  // To validate user, load user object from GitHub.

  return fetch(`https://api.github.com/repos/${hook}/contents/${directory}/${filename}`, {
    method: 'PUT',
    body: JSON.stringify({ message: bojData.meta.message, content: code, sha }),
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  })
    .then((res) => res.json())
    .then((data) => {
      if (debug && type === CommitType.readme) console.log('data', data);

      if (data != null && (data !== data.content) != null && data.content.sha != null && data.content.sha !== undefined) {

        const { sha } = data.content; // get updated SHA
        updateStatsPostUpload(bojData, sha, type, cb);
        // getStats().then((stats) => {
        //   /* Local Storage에 Stats Object가 없다면 초기화한다. */
        //   if (stats === null || stats === {} || stats === undefined) {
        //     // create stats object
        //     stats = {};
        //     stats.version = '1.0.2';
        //     stats.submission = {};
        //   }
        //   const filePath = bojData.meta.problemId + bojData.meta.problemId + bojData.meta.language;
        //   const { submissionId } = bojData.submission;

        //   if (isNull(stats.submission[filePath])) {
        //     stats.submission[filePath] = {};
        //   }

        //   stats.submission[filePath].submissionId = submissionId;
        //   stats.submission[filePath][type] = sha; // update sha key.
        //   saveStats(stats).then(() => {
        //     if (debug) console.log(`Successfully committed ${filename} to github`);
        //     if (cb !== undefined) cb();
        //   });
        // });
      }
    });
}


/* 모든 코드를 github에 업로드하는 함수 */
async function uploadAllSolvedProblem() {
  const tree_items = [];
  const git = new GitHub(await getHook(), await getToken());
  const { refSHA, ref } = await git.getReference();
  await findUniqueResultTableListByUsername(findUsername())
    .then((list) => {
      return Promise.all(
        list.map(async (problem) => {
          const bojData = await findData(problem);
          if (isNull(bojData)) return;
          tree_items.push(await git.createBlob(bojData.submission.code, `${bojData.meta.directory}/${bojData.meta.fileName}`)); // )); // 소스코드 파일
          if(tree_items.slice(-1).sha!==undefined) updateStatsPostUpload(bojData, tree_items.slice(-1).sha, CommitType.code);
          tree_items.push(await git.createBlob(bojData.meta.readme, `${bojData.meta.directory}/README.md`)); // )); // readme 파일
          if(tree_items.slice(-1).sha!==undefined) updateStatsPostUpload(bojData, tree_items.slice(-1).sha, CommitType.readme);
        }),
      );
    })
    .then((_) => git.createTree(refSHA, tree_items))
    .then((treeSHA) => git.createCommit('전체 코드 업로드', treeSHA, refSHA))
    .then((commitSHA) => git.updateHead(ref, commitSHA))
    .then((_) => {
      if (debug) console.log('전체 코드 업로드 완료');
    })
    .catch((e) => {
      if (debug) console.log('전체 코드 업로드 실패', e);
    });
}