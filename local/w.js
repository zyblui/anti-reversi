let workerScope = {};
const INITIAL_POSITION = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, -1, 1, 0, 0, 0],
    [0, 0, 0, 1, -1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
];
workerScope.board = structuredClone(INITIAL_POSITION);
workerScope.playerColor = 1;
workerScope.searchDepth = 6;
function workerMsg(e) {
    if (e.type == "computerPlay") {
        workerScope.playerColor = e.color;
        workerScope.board = e.board;
        workerScope.searchDepth = e.depth;
        if (!validMovesArr().length) return;
        mainMsg({
            type: "analysis",
            analysis: cpu(),
            nodes: workerScope.positionsConsidered
        });
    }
}
workerScope.positionsConsidered = 0;
function cpu() {
    //let date = new Date();
    let discs = discCount(workerScope.board).black + discCount(workerScope.board).white;
    let result = initSearchSort(workerScope.board, workerScope.searchDepth, workerScope.playerColor);
    //console.log(result);
    result.sort(function (a, b) {
        return b.evaluation - a.evaluation;
    });
    result = result.slice(0, 3);
    let analysis = [];
    for (let r of result) {
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 7; j++) {
                if (workerScope.board[i][j] == 0 && r.board[i][j] != 0) {
                    analysis.push({
                        coord: LETTERS[j] + (i + 1),
                        evaluation: r.evaluation
                    });
                }
            }
        }
    }
    //console.log("speed: " + workerScope.positionsConsidered / ((new Date() - date) / 1000) + " nodes per second, transpo hits: " + workerScope.transpoHit);
    return analysis;
}
function getValidMoves(currentBoard, color) {
    let situations = [];
    for (let m = 0; m <= 7; m++) {
        for (let n = 0; n <= 7; n++) {
            let placeResult = placeDisc(currentBoard, m, n, color);
            if (placeResult.isValid) {
                let placeResultBoard = placeResult.board;
                situations.push({
                    board: placeResultBoard,
                    lastColorPlayed: color
                });
            }
        }
    }
    return situations;
}
function search(currentMove, depth, color, playerColor) {
    if (depth >= 1) {
        let moves = getValidMoves(currentMove.board, color);
        workerScope.positionsConsidered += moves.length;
        for (let i = 0; i < moves.length; i++) {
            if (depth >= 2) {
                moves[i].nextMoves = search(moves[i], depth - 1, -color, playerColor);
                if (!moves[i].nextMoves.length) moves[i].nextMoves.push({
                    board: moves[i].board,
                    lastColorPlayed: -color,
                    evaluation: evaluate(moves[i].board, playerColor)
                });
                moves[i].evaluation = (color == playerColor) ? Math.min(...moves[i].nextMoves.map((x) => x.evaluation)) : Math.max(...moves[i].nextMoves.map((x) => x.evaluation));
                if (moves[1]?.evaluation) {
                    if ((color == playerColor && moves[0].evaluation >= moves[1].evaluation) || (color != playerColor && moves[0].evaluation <= moves[1].evaluation)) moves.splice(1, 1);
                    else moves.splice(0, 1);
                    i--;
                }
            } else if (depth == 1) {
                moves[i].evaluation = evaluate(moves[i].board, playerColor);
            }
        }
        return moves;
    }
}

function searchAlpha(currentMove, depth, color, playerColor, parentBestVal, clearNextMoves, isShallowSearch, isLastPass) {
    let currentBoard = currentMove.board;
    if (currentMove.nextMoves.length) {
        for (let i of currentMove.nextMoves) {
            searchAlpha(i, depth - 1, -color, playerColor, currentMove.evaluation, true, false, false);
            if (color == playerColor) {//current move is a maximizer, parent is a minimizer
                currentMove.evaluation = Math.max(currentMove.evaluation, i.evaluation);
                if (currentMove.evaluation > parentBestVal) {
                    break;
                }
            } else {//current move is a minimizer, parent is a maximizer
                currentMove.evaluation = Math.min(currentMove.evaluation, i.evaluation);
                if (currentMove.evaluation < parentBestVal) {
                    break;
                }
            }
        }
    } else {
        outerFor: for (let m = 0; m <= 7; m++) {
            for (let n = 0; n <= 7; n++) {
                let placeResult = placeDisc(currentBoard, m, n, color);
                if (placeResult.isValid) {
                    let placeResultBoard = placeResult.board;
                    currentMove.nextMoves.push({
                        board: placeResultBoard,
                        lastColorPlayed: color,
                        evaluation: (color == playerColor) ? +Infinity : -Infinity,
                        nextMoves: []
                    });
                    if (depth > 1) {
                        searchAlpha(currentMove.nextMoves[currentMove.nextMoves.length - 1], depth - 1, -color, playerColor, currentMove.evaluation, !isShallowSearch, isShallowSearch, false);
                    } else {
                        currentMove.nextMoves[currentMove.nextMoves.length - 1].evaluation = evaluateNew(placeResultBoard, playerColor);
                    }
                    if (color == playerColor) {//current move is a maximizer, parent is a minimizer
                        currentMove.evaluation = Math.max(currentMove.evaluation, currentMove.nextMoves[currentMove.nextMoves.length - 1].evaluation);
                        if (!isShallowSearch && currentMove.evaluation > parentBestVal) {
                            break outerFor;
                        }
                    } else {//current move is a minimizer, parent is a maximizer
                        currentMove.evaluation = Math.min(currentMove.evaluation, currentMove.nextMoves[currentMove.nextMoves.length - 1].evaluation);
                        if (!isShallowSearch && currentMove.evaluation < parentBestVal) {
                            break outerFor;
                        }
                    }
                }
            }
        }
        if (!currentMove.nextMoves.length) {
            currentMove.nextMoves = [{
                board: currentBoard,
                lastColorPlayed: -color,
                evaluation: (color == playerColor) ? +Infinity : -Infinity,
                nextMoves: []
            }];
            if (depth > 1 && !isLastPass) {
                searchAlpha(currentMove.nextMoves[0], depth, -color, playerColor, currentMove.evaluation, !isShallowSearch, isShallowSearch, true);
            } else if (isLastPass) {
                currentMove.nextMoves[0].evaluation = calculateFinalEval(currentBoard, playerColor);
            } else {
                currentMove.nextMoves[0].evaluation = evaluateNew(currentBoard, playerColor);
            }
            currentMove.evaluation = currentMove.nextMoves[0].evaluation;
        }
    }
    if (clearNextMoves) currentMove.nextMoves = [];
    return currentMove;
}
function initSearchAlpha(currentBoard, depth, color) {
    return searchAlpha({
        board: currentBoard,
        nextMoves: [],
        evaluation: -Infinity,
        lastColorPlayed: -color
    }, depth, color, color, +Infinity, false, false, false).nextMoves;
}

//workerScope.transpositionTable = {};
function initSearchSort(currentBoard, depth, color) {
    workerScope.positionsConsidered = 0;
    /*workerScope.transpositionTable = {};
    workerScope.transpoHit = 0;*/
    let shallowDepth = 0, exactDepth = 0;
    if (depth >= 8) {
        shallowDepth = 4;
        exactDepth = 12;
    } else {
        shallowDepth = 2;
        exactDepth = 12;
    }
    let sortedFlat = currentBoard.flat().sort();
    let shallowResult = shallowSearch(currentBoard, shallowDepth, color);
    //Continue searching to the depth set
    let blanks = sortedFlat.indexOf(1) - sortedFlat.indexOf(0);
    if (blanks <= exactDepth) {
        return searchAlpha(shallowResult, Infinity/*blanks+2*/, color, color, +Infinity, false, false, false).nextMoves;
    } else {
        return searchAlpha(shallowResult, depth, color, color, +Infinity, false, false, false).nextMoves;
    }
}
function shallowSearch(currentBoard, shallowDepth, color) {
    let shallowResult = searchAlpha({
        board: currentBoard,
        nextMoves: [],
        evaluation: -Infinity,
        lastColorPlayed: -color
    }, shallowDepth, color, color, +Infinity, false, true, false);
    //Sort and reset evaluations
    sort(shallowResult, false);
    return shallowResult;
}
function sort(move, evalIsInfinity) {
    if (move.nextMoves.length) {
        move.nextMoves.sort((a, b) => (evalIsInfinity) ? (a.evaluation - b.evaluation) : (b.evaluation - a.evaluation));
        for (let i of move.nextMoves) {
            sort(i, !evalIsInfinity);
        }
    }
    move.evaluation = (evalIsInfinity) ? Infinity : -Infinity;
}
function getStableDiscs(currentBoard) {
    let arr = [
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false],
        [false, false, false, false, false, false, false, false]
    ];
    let directionIsFull = [
        [true, true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true]
    ];
    for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 7; j++) {
            if (!currentBoard[i][j]) {
                directionIsFull[0][i] = false;
                directionIsFull[1][j] = false;
                directionIsFull[2][i + j] = false;
                directionIsFull[3][7 - i + j] = false;
            }
        }
    }
    let directionProtected = [
        [
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true]
        ], [
            [true, true, true, true, true, true, true, true],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [false, false, false, false, false, false, false, false],
            [true, true, true, true, true, true, true, true]
        ], [
            [true, true, true, true, true, true, true, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, true, true, true, true, true, true, true]
        ], [
            [true, true, true, true, true, true, true, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, false, false, false, false, false, false, true],
            [true, true, true, true, true, true, true, true]
        ]
    ];
    //!
    for (let i = 0; i < directionIsFull[0].length; i++) {
        if (directionIsFull[0][i]) directionProtected[0][i] = [true, true, true, true, true, true, true, true];
    }
    for (let i = 0; i < directionIsFull[1].length; i++) {
        if (directionIsFull[1][i]) {
            for (let j = 0; j < directionProtected[1].length; j++) {
                directionProtected[1][j][i] = true;
            }
        }
    }
    for (let i = 0; i <= 14; i++) {
        if (directionIsFull[2][i]) {
            for (let j = Math.max(i - 7, 0); j <= Math.min(i, 7); j++) {
                directionProtected[2][j][i - j] = true;
            }
        }
    }
    for (let i = 0; i <= 14; i++) {
        if (directionIsFull[3][i]) {
            for (let j = Math.max(7 - i, 0); j <= Math.min(14 - i, 7); j++) {
                directionProtected[3][j][i - 7 + j] = true;
            }
        }
    }
    for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 7; j++) {
            if (!currentBoard[i][j]) {
                for (let l = 0; l <= 3; l++) {
                    directionProtected[l][i][j] = null;
                }
            } else if (arr[i][j]) {
                for (let l = 0; l <= 3; l++) {
                    directionProtected[l][i][j] = true;
                }
            }
        }
    }
    let loop = true;
    while (loop) {
        loop = false;
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 7; j++) {
                if (((directionProtected[0][i][j - 1] && currentBoard[i][j - 1] == currentBoard[i][j]) || (directionProtected[0][i][j + 1] && currentBoard[i][j + 1] == currentBoard[i][j])) && !directionProtected[0][i][j]) {
                    directionProtected[0][i][j] = true;
                    loop = true;
                }
                if (((directionProtected[3][i - 1] && directionProtected[3][i - 1][j - 1] && currentBoard[i - 1][j - 1] == currentBoard[i][j]) || (directionProtected[3][i + 1] && directionProtected[3][i + 1][j + 1] && currentBoard[i + 1][j + 1] == currentBoard[i][j])) && !directionProtected[3][i][j]) {
                    directionProtected[3][i][j] = true;
                    loop = true;
                }
                if (((directionProtected[2][i + 1] && directionProtected[2][i + 1][j - 1] && currentBoard[i + 1][j - 1] == currentBoard[i][j]) || (directionProtected[2][i - 1] && directionProtected[2][i - 1][j + 1] && currentBoard[i - 1][j + 1] == currentBoard[i][j])) && !directionProtected[2][i][j]) {
                    directionProtected[2][i][j] = true;
                    loop = true;
                }
                if (((directionProtected[1][i + 1] && directionProtected[1][i + 1][j] && currentBoard[i + 1][j] == currentBoard[i][j]) || (directionProtected[1][i - 1] && directionProtected[1][i - 1][j] && currentBoard[i - 1][j] == currentBoard[i][j])) && !directionProtected[1][i][j]) {
                    directionProtected[1][i][j] = true;
                    loop = true;
                }
            }
        }
        for (let i = 0; i <= 7; i++) {
            for (let j = 0; j <= 7; j++) {
                if (directionProtected[0][i][j] && directionProtected[1][i][j] && directionProtected[2][i][j] && directionProtected[3][i][j] && !arr[i][j]) {
                    arr[i][j] = true;
                    loop = true;
                }
            }
        }
    }
    return arr;
}
function initSearch(currentBoard, depth, color) {
    return search({
        board: currentBoard
    }, depth, color, color);
}
function evaluate(currentBoard, player) {
    workerScope.positionsConsidered++;
    let flat = currentBoard.flat();
    if (!flat.includes(player)) return 64 * 17;
    else if (!flat.includes(-player)) return -64 * 17;
    else if (!flat.includes(0)) {
        let sortedFlat = flat.sort();
        return (sortedFlat.indexOf(1) - 32) * 2 * player * 17;
    }
    let evaluation = 0;
    let stableDiscs = getStableDiscs(currentBoard);
    for (let m = 0; m < 8; m++) {
        for (let n = 0; n < 8; n++) {
            evaluation += ((stableDiscs[m][n]) ? -17 : STATIC_TABLE[m][n]) * currentBoard[m][n];
        }
    }
    evaluation *= player;
    return evaluation;
}
function calculateFinalEval(bd, player) {
    workerScope.positionsConsidered++;
    let discs = discCount(bd);
    let blackAdvantageAnti = 0;
    if (discs.black != discs.white) {
        blackAdvantageAnti = (64 - discs.black - discs.white + Math.abs(discs.black - discs.white)) * ((discs.black < discs.white) ? 1 : -1);
    }
    return blackAdvantageAnti * player;
}
const RANDOM_NUMBERS = {
    "black": [
        41342764616798606474384576947023n,
        39502617794573576611731634998186n,
        72199079118996521906985689921234n,
        34413652631428867835260041962454n,
        24112201098560699403963877001380n,
        37846257283769664522889965444351n,
        79852033551685901558529156051267n,
        75601519863540940288722524039940n,
        20447806340106290244950961405593n,
        49343928043751219157200867899382n,
        12770294408193721838017625907205n,
        20879540781754628260190738548584n,
        31599190569533142442692076947827n,
        11210047796793986295237799777729n,
        9951534261384980900896165166464n,
        15066188589688642571539047186158n,
        16085903034979360393485034469963n,
        41191604611629381374165468991729n,
        20749392436246930171819585329247n,
        67156499329577081801243447959043n,
        9128862829279019229396357440916n,
        35818739277733622903252574597934n,
        75394627087305857443726827842842n,
        61188070154650905759921945922196n,
        37100499701437645616446517537950n,
        25263160999704276589099102075327n,
        54469630605556094980046457105624n,
        62911819514006706134577909225925n,
        77329949472871631372467498911145n,
        4571592618090010964310788640420n,
        71931272107098668918511037392085n,
        25598273064587445927041889020717n,
        64052950405999372139077967695304n,
        67843398899989218943282806160692n,
        55367638718468912881378709653983n,
        50490864330344370870841855010975n,
        52960231580128150999738275193402n,
        79730712443995164376232283838856n,
        39781428655979011606867975412445n,
        43501350444307148824728194852702n,
        36441996641073886179239764782494n,
        65712706535052695086391433747757n,
        8520174939781300350787863500970n,
        4761939870300020086295935004383n,
        54061427832345405234366570916283n,
        57363413741197618140990680737077n,
        1908002627099787691208363275022n,
        51680039901773852922386461651450n,
        147932321460353694067262595010n,
        12015544516868476754565590625577n,
        73916729246897003559750670241720n,
        44307701190642949828559088731487n,
        56654427759714078526706288579506n,
        8187861324044628104883324089076n,
        4370030825011688278903636326494n,
        61112717171712314115978864789348n,
        50441989655398694499408355241900n,
        28910500687366962460565731450227n,
        11853499935034319933553128790128n,
        42325840442886751305746882440718n,
        6914466702644232647140949147206n,
        14532660284588163598397317472569n,
        25675459437588027520418940074815n,
        1135793996869752157658652155662n
    ],
    "player": {
        "-1": 53026732565999779267701679725464n,
        "1": 40042061918872065961181899947968n
    },
    "white": [
        79291002518292718689214318433868n,
        25311455844268167400383473270554n,
        47841130831576966170941861348844n,
        50016445702166841614442780956806n,
        79392301858161758079553410806132n,
        14023243938119393745700100663960n,
        79587466323805195462228909757594n,
        24638104448451116060068350140200n,
        25423875665431295882252528404419n,
        19592326575755566192728212697974n,
        62216795743312066017367354189427n,
        30284763306033333953822739291962n,
        61348316566161392353959838032781n,
        60252289078989678618044058374478n,
        55075001697351125015927253778216n,
        19713196726029780437553534105286n,
        59660758478050060616463182919912n,
        68388894398742002007896330771897n,
        24567598138870549224233880232858n,
        62617055152716592717899857574407n,
        34265848247164658999875688612350n,
        9195949022965365795210614463087n,
        31921788264498129866218941124742n,
        77463802075655197341449281963446n,
        11553686078021358171876034703022n,
        73757137491883732883817593631165n,
        71230492999852858169499497005826n,
        28619709186920783553973519788057n,
        56761858636126682598847040815161n,
        59115770189719685550785925156569n,
        44936825723583089643406049184736n,
        24398372474433057947022137704779n,
        17907100077103916099492259867571n,
        75815647351215138781288873693745n,
        23697359784427797860209383823355n,
        50819839078814253973810544151793n,
        3976678890993287690338835393022n,
        62789216449050361268673378769054n,
        63281192396048708472142634459727n,
        69831170889362020526955289212530n,
        50503534725190801163612088865081n,
        38795137464958336746170754357920n,
        7211288234381103628922761592786n,
        8509859572927454706518850414982n,
        33164530513005379031095156465694n,
        72260778182102998183978530540642n,
        44088109400730935166678449251662n,
        44204588483002075839697463138926n,
        68207291236436562765884950046648n,
        31402477878799060284079102167646n,
        10745809297868892571562390744874n,
        57793093994113962824809110874700n,
        65842606004425319897640037794323n,
        20487325791130651393057831063681n,
        68138742585965316181839097361330n,
        71927836868180969842559455710369n,
        25361846138286961438879385995140n,
        31555925500483810849067098768556n,
        27552083850041540023400983952847n,
        36030561546083984652492585690225n,
        38294221317613959466918252374785n,
        78063592269457910350857210315096n,
        15173201547398194314044044501241n,
        65565201870650470168682087828226n
    ]
};
function hash(bd, player) {
    let tempBd = bd.flat();
    let hashKey = 0n;
    for (let i = 0; i < 64; i++) {
        if (tempBd[i] == 1) hashKey ^= RANDOM_NUMBERS.black[i];
        else if (tempBd[i] == -1) hashKey ^= RANDOM_NUMBERS.white[i];
    }
    return hashKey ^ RANDOM_NUMBERS.player[player];
}
function evaluateNew(bd, player) {
    workerScope.positionsConsidered++;/*
    if (workerScope.transpositionTable[hash(bd,player)]) {
        workerScope.transpoHit++;
        return workerScope.transpositionTable[hash(bd,player)];
    }*/

    let evaluation = 0;
    let discs = discCount(bd);
    let moveIndex = discs.black + discs.white - 4 - 1;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[1][0], bd[1][1], bd[1][2], bd[2][0], bd[2][1], bd[2][2]),
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[0][1], bd[1][1], bd[2][1], bd[0][2], bd[1][2], bd[2][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[1][7], bd[1][6], bd[1][5], bd[2][7], bd[2][6], bd[2][5]),
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[0][6], bd[1][6], bd[2][6], bd[0][5], bd[1][5], bd[2][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[6][0], bd[6][1], bd[6][2], bd[5][0], bd[5][1], bd[5][2]),
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[7][1], bd[6][1], bd[5][1], bd[7][2], bd[6][2], bd[5][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner33"][Math.min(
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[6][7], bd[6][6], bd[6][5], bd[5][7], bd[5][6], bd[5][5]),
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[7][6], bd[6][6], bd[5][6], bd[7][5], bd[6][5], bd[5][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[0][3], bd[0][4], bd[1][0], bd[1][1], bd[1][2], bd[1][3], bd[1][4])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[3][0], bd[4][0], bd[0][1], bd[1][1], bd[2][1], bd[3][1], bd[4][1])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[7][3], bd[7][4], bd[6][0], bd[6][1], bd[6][2], bd[6][3], bd[6][4])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[4][0], bd[3][0], bd[7][1], bd[6][1], bd[5][1], bd[4][1], bd[3][1])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[0][4], bd[0][3], bd[1][7], bd[1][6], bd[1][5], bd[1][4], bd[1][3])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[3][7], bd[4][7], bd[0][6], bd[1][6], bd[2][6], bd[3][6], bd[4][6])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[4][7], bd[3][7], bd[7][6], bd[6][6], bd[5][6], bd[4][6], bd[3][6])
    ] || 0;
    evaluation += coeffs[moveIndex]["corner52"][
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[7][4], bd[7][3], bd[6][7], bd[6][6], bd[6][5], bd[6][4], bd[6][3])
    ] || 0;
    /*evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[0][3], bd[0][4], bd[0][5], bd[0][6], bd[0][7]),
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[0][4], bd[0][3], bd[0][2], bd[0][1], bd[0][0])
    )]||0;
    evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[7][3], bd[7][4], bd[7][5], bd[7][6], bd[7][7]),
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[7][4], bd[7][3], bd[7][2], bd[7][1], bd[7][0])
    )]||0;
    evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[3][0], bd[4][0], bd[5][0], bd[6][0], bd[7][0]),
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[4][0], bd[3][0], bd[2][0], bd[1][0], bd[0][0])
    )]||0;
    evaluation += coeffs[moveIndex]["row1"][Math.min(
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[3][7], bd[4][7], bd[5][7], bd[6][7], bd[7][7]),
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[4][7], bd[3][7], bd[2][7], bd[1][7], bd[0][7])
    )]||0;*/
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[1][0], bd[1][1], bd[1][2], bd[1][3], bd[1][4], bd[1][5], bd[1][6], bd[1][7]),
        getPatternNo(bd[1][7], bd[1][6], bd[1][5], bd[1][4], bd[1][3], bd[1][2], bd[1][1], bd[1][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[6][0], bd[6][1], bd[6][2], bd[6][3], bd[6][4], bd[6][5], bd[6][6], bd[6][7]),
        getPatternNo(bd[6][7], bd[6][6], bd[6][5], bd[6][4], bd[6][3], bd[6][2], bd[6][1], bd[6][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[0][1], bd[1][1], bd[2][1], bd[3][1], bd[4][1], bd[5][1], bd[6][1], bd[7][1]),
        getPatternNo(bd[7][1], bd[6][1], bd[5][1], bd[4][1], bd[3][1], bd[2][1], bd[1][1], bd[0][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["row2"][Math.min(
        getPatternNo(bd[0][6], bd[1][6], bd[2][6], bd[3][6], bd[4][6], bd[5][6], bd[6][6], bd[7][6]),
        getPatternNo(bd[7][6], bd[6][6], bd[5][6], bd[4][6], bd[3][6], bd[2][6], bd[1][6], bd[0][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[2][0], bd[2][1], bd[2][2], bd[2][3], bd[2][4], bd[2][5], bd[2][6], bd[2][7]),
        getPatternNo(bd[2][7], bd[2][6], bd[2][5], bd[2][4], bd[2][3], bd[2][2], bd[2][1], bd[2][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[5][0], bd[5][1], bd[5][2], bd[5][3], bd[5][4], bd[5][5], bd[5][6], bd[5][7]),
        getPatternNo(bd[5][7], bd[5][6], bd[5][5], bd[5][4], bd[5][3], bd[5][2], bd[5][1], bd[5][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[0][2], bd[1][2], bd[2][2], bd[3][2], bd[4][2], bd[5][2], bd[6][2], bd[7][2]),
        getPatternNo(bd[7][2], bd[6][2], bd[5][2], bd[4][2], bd[3][2], bd[2][2], bd[1][2], bd[0][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["row3"][Math.min(
        getPatternNo(bd[0][5], bd[1][5], bd[2][5], bd[3][5], bd[4][5], bd[5][5], bd[6][5], bd[7][5]),
        getPatternNo(bd[7][5], bd[6][5], bd[5][5], bd[4][5], bd[3][5], bd[2][5], bd[1][5], bd[0][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[3][0], bd[3][1], bd[3][2], bd[3][3], bd[3][4], bd[3][5], bd[3][6], bd[3][7]),
        getPatternNo(bd[3][7], bd[3][6], bd[3][5], bd[3][4], bd[3][3], bd[3][2], bd[3][1], bd[3][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[4][0], bd[4][1], bd[4][2], bd[4][3], bd[4][4], bd[4][5], bd[4][6], bd[4][7]),
        getPatternNo(bd[4][7], bd[4][6], bd[4][5], bd[4][4], bd[4][3], bd[4][2], bd[4][1], bd[4][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[0][3], bd[1][3], bd[2][3], bd[3][3], bd[4][3], bd[5][3], bd[6][3], bd[7][3]),
        getPatternNo(bd[7][3], bd[6][3], bd[5][3], bd[4][3], bd[3][3], bd[2][3], bd[1][3], bd[0][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["row4"][Math.min(
        getPatternNo(bd[0][4], bd[1][4], bd[2][4], bd[3][4], bd[4][4], bd[5][4], bd[6][4], bd[7][4]),
        getPatternNo(bd[7][4], bd[6][4], bd[5][4], bd[4][4], bd[3][4], bd[2][4], bd[1][4], bd[0][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[0][0], bd[0][1], bd[0][2], bd[0][3], bd[0][4], bd[0][5], bd[0][6], bd[0][7], bd[1][1], bd[1][6]),
        getPatternNo(bd[0][7], bd[0][6], bd[0][5], bd[0][4], bd[0][3], bd[0][2], bd[0][1], bd[0][0], bd[1][6], bd[1][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[7][0], bd[7][1], bd[7][2], bd[7][3], bd[7][4], bd[7][5], bd[7][6], bd[7][7], bd[6][1], bd[6][6]),
        getPatternNo(bd[7][7], bd[7][6], bd[7][5], bd[7][4], bd[7][3], bd[7][2], bd[7][1], bd[7][0], bd[6][6], bd[6][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[0][0], bd[1][0], bd[2][0], bd[3][0], bd[4][0], bd[5][0], bd[6][0], bd[7][0], bd[1][1], bd[6][1]),
        getPatternNo(bd[7][0], bd[6][0], bd[5][0], bd[4][0], bd[3][0], bd[2][0], bd[1][0], bd[0][0], bd[6][1], bd[1][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["edgex"][Math.min(
        getPatternNo(bd[0][7], bd[1][7], bd[2][7], bd[3][7], bd[4][7], bd[5][7], bd[6][7], bd[7][7], bd[1][6], bd[6][6]),
        getPatternNo(bd[7][7], bd[6][7], bd[5][7], bd[4][7], bd[3][7], bd[2][7], bd[1][7], bd[0][7], bd[6][6], bd[1][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[0][3], bd[1][2], bd[2][1], bd[3][0]),
        getPatternNo(bd[3][0], bd[2][1], bd[1][2], bd[0][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[0][4], bd[1][5], bd[2][6], bd[3][7]),
        getPatternNo(bd[3][7], bd[2][6], bd[1][5], bd[0][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[4][0], bd[5][1], bd[6][2], bd[7][3]),
        getPatternNo(bd[7][3], bd[6][2], bd[5][1], bd[4][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal4"][Math.min(
        getPatternNo(bd[4][7], bd[5][6], bd[6][5], bd[7][4]),
        getPatternNo(bd[7][4], bd[6][5], bd[5][6], bd[4][7])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[0][4], bd[1][3], bd[2][2], bd[3][1], bd[4][0]),
        getPatternNo(bd[4][0], bd[3][1], bd[2][2], bd[1][3], bd[0][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[7][4], bd[6][3], bd[5][2], bd[4][1], bd[3][0]),
        getPatternNo(bd[3][0], bd[4][1], bd[5][2], bd[6][3], bd[7][4])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[0][3], bd[1][4], bd[2][5], bd[3][6], bd[4][7]),
        getPatternNo(bd[4][7], bd[3][6], bd[2][5], bd[1][4], bd[0][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal5"][Math.min(
        getPatternNo(bd[7][3], bd[6][4], bd[5][5], bd[4][6], bd[3][7]),
        getPatternNo(bd[3][7], bd[4][6], bd[5][5], bd[6][4], bd[7][3])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[0][5], bd[1][4], bd[2][3], bd[3][2], bd[4][1], bd[5][0]),
        getPatternNo(bd[5][0], bd[4][1], bd[3][2], bd[2][3], bd[1][4], bd[0][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[0][2], bd[1][3], bd[2][4], bd[3][5], bd[4][6], bd[5][7]),
        getPatternNo(bd[2][0], bd[3][1], bd[4][2], bd[5][3], bd[6][4], bd[7][5])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[7][5], bd[6][4], bd[5][3], bd[4][2], bd[3][1], bd[2][0]),
        getPatternNo(bd[5][7], bd[4][6], bd[3][5], bd[2][4], bd[1][3], bd[0][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal6"][Math.min(
        getPatternNo(bd[7][2], bd[6][3], bd[5][4], bd[4][5], bd[3][6], bd[2][7]),
        getPatternNo(bd[2][7], bd[3][6], bd[4][5], bd[5][4], bd[6][3], bd[7][2])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[0][6], bd[1][5], bd[2][4], bd[3][3], bd[4][2], bd[5][1], bd[6][0]),
        getPatternNo(bd[6][0], bd[5][1], bd[4][2], bd[3][3], bd[2][4], bd[1][5], bd[0][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[0][1], bd[1][2], bd[2][3], bd[3][4], bd[4][5], bd[5][6], bd[6][7]),
        getPatternNo(bd[1][0], bd[2][1], bd[3][2], bd[4][3], bd[5][4], bd[6][5], bd[7][6])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[7][6], bd[6][5], bd[5][4], bd[4][3], bd[3][2], bd[2][1], bd[1][0]),
        getPatternNo(bd[6][7], bd[5][6], bd[4][5], bd[3][4], bd[2][3], bd[1][2], bd[0][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal7"][Math.min(
        getPatternNo(bd[7][1], bd[6][2], bd[5][3], bd[4][4], bd[3][5], bd[2][6], bd[1][7]),
        getPatternNo(bd[1][7], bd[2][6], bd[3][5], bd[4][4], bd[5][3], bd[6][2], bd[7][1])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal8"][Math.min(
        getPatternNo(bd[0][0], bd[1][1], bd[2][2], bd[3][3], bd[4][4], bd[5][5], bd[6][6], bd[7][7]),
        getPatternNo(bd[7][7], bd[6][6], bd[5][5], bd[4][4], bd[3][3], bd[2][2], bd[1][1], bd[0][0])
    )] || 0;
    evaluation += coeffs[moveIndex]["diagonal8"][Math.min(
        getPatternNo(bd[0][7], bd[1][6], bd[2][5], bd[3][4], bd[4][3], bd[5][2], bd[6][1], bd[7][0]),
        getPatternNo(bd[7][0], bd[6][1], bd[5][2], bd[4][3], bd[3][4], bd[2][5], bd[1][6], bd[0][7])
    )] || 0;
    evaluation /= 46;

    //workerScope.transpositionTable[hash(bd,player)] = evaluation * player;
    return evaluation * player;
}
function getPatternNo() {
    let no = 0;
    for (let i = 0; i < arguments.length; i++) {
        //empty:0 black:1 white:2
        if (arguments[i] == 1) no += 1 * 3 ** (arguments.length - 1 - i);
        else if (arguments[i] == -1) no += 2 * 3 ** (arguments.length - 1 - i);
    }
    return no;
}


let generatedData = [];
function generateData(num) {
    for (let k = 0; k < num; k++) {
        console.log("generating " + (k + 1) + "/" + num);
        let data = {
            "moves": [],
            "type": 1
        };
        workerScope.board = structuredClone(INITIAL_POSITION);
        let isPass = false;
        for (let i = 0; i < 60;) {
            let cpuResult = cpu();
            let coord = "";
            if (cpuResult.length >= 3 && i < 4) coord = cpuResult[Math.floor(Math.random() * 3)].coord;
            else if (cpuResult.length >= 2 && i < 52) coord = cpuResult[Math.floor(Math.random() * 1.5)].coord;
            else if (cpuResult.length >= 1) coord = cpuResult[0].coord;
            if (coord) {
                isPass = false;
                data.moves.push(coord);
            } else {
                if (!isPass) {
                    isPass = true;
                    workerScope.playerColor = -workerScope.playerColor;
                    continue;
                } else break;
            }
            let y = LETTERS.indexOf(coord[0]);
            let x = Number(coord[1]) - 1;
            workerScope.board = placeDisc(workerScope.board, x, y, workerScope.playerColor).board;
            workerScope.playerColor = -workerScope.playerColor;
            i++;
        }
        console.log(data.moves.join(""));
        generatedData.push(data);
    }
}