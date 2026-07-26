# 데이터 스키마 (data-schema)

`src/data.js` 의 `PROBLEMS[]` 각 항목 필드.

## 공통 필드
| 필드 | 뜻 |
|------|----|
| id | 스테이지 ID (예: "A-01") |
| sourceProblem | 교재 문제 번호 (예: "4-14") |
| sourcePage | 교재 쪽수 |
| title | 제목 |
| world | "abstraction" \| "algorithm" \| "both" |
| engine | 사용할 엔진 키 (ENGINES의 키) |
| difficulty | "basic" \| "normal" \| "challenge" |
| estimatedMinutes | 예상 플레이 시간(분) |
| originalProblemText | 교재 원문(의미 불변) |
| studentFriendlyText | 중학생용 쉬운 설명 |
| conditions[] | 문제 조건 목록 |
| irrelevantInformation[] | 불필요한 정보 |
| correctAnswers[] | 게임에서 사용할 정답 |
| equivalentAnswers[] | 동등하게 인정하는 답 |
| config | **엔진별 설정**(아래) |
| hint1Observation / hint2KeyCondition / hint3NextAction | 1~3단계 힌트 |
| guidedSolution[] | 4단계 단계별 풀이 |
| fullExplanation | 완전 해설(표준 12항목) |
| learningGoals[] | 학습 목표 |
| curriculumTags[] | 교육과정 연결 태그 |
| reflectionQuestions[] | 생각해 보기 질문 |
| teacher | 교사용 심화(번호·쪽·난이도·검증·오답·발문·활동·확장·평가·시간·비고) |
| answerSource | "book" \| "derived" \| "book-and-verified" |
| verificationMethod / verificationEvidence | 검증 방법·근거 |

## answerSource 의미
- **book**: 교재에 정답이 있고 그대로 확인
- **derived**: 교재에 정답이 없어 직접 해결
- **book-and-verified**: 교재 정답을 독립적으로 재검증

## config (엔진별)
- `deduce`: `{candidates:[{label,v}], tests:[{text,fn(v)}], answerKeys:[label...]}`
- `base`: `{equations:[str], bases:[int], answerBase}`
- `analogy`: `{mode:"odd|proportion|next", prompt, options:[{id,shape}], answer, ...}` (shape: `{outline,fill,size,rotate,dot}`)
- `sequence`: `{seq:[..], answer, ruleOptions:[{id,text,correct}], extras:[{text,answers}]}`
- `hub`: `{spokes, options:[..], acceptable:[..], elegant}`
- `waterjug`: `{caps:[..], start:[..], goal:[..], labels:[..], minPours}`
- `orderSteps`: `{steps:[{id,text}], correctOrder:[..], timeline}`
- `mobile`: `{tree(bar/leaf, unknown), options:[..], answer}`
- `balance`: `{n, oddIndex, heavier, maxWeighings, optimalWeighings}`
- `hanoi`: `{modes:[..], defaultDisks, minMoves:{n:..}}`
- `river`: `{items:[{id,name,emoji}], farmer, conflicts:[[a,b]], boatCapacity, minCrossings}`
- `maxpath`: `{grid:[[..]], start:[r,c], end:[r,c], maxSum}`
- `iterate`: `{mode:"search|accumulate", ...}`
- `graph`: `{mode:"analyze|trail", nodes:[{id,name,x,y}], edges:[[u,v]], degrees, ...}`
- `bridge`: `{people:[{id,name,emoji,time}], boatMax, minTime}`
- `doors`: `{n, startOpen, answerOpen, closed:[..]}`
- `nim`: `{total, maxTake, loseOnLast, winningFirstMove}`
