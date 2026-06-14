import type { InterventionKind, StreamContext } from '../../../src/index';

export interface ScriptedCandidate {
  text: string;
  applied: InterventionKind[];
  typicality: number;
}

export interface ScenarioTurn {
  viewerComments: string[];
  draft: string;
  candidates: ScriptedCandidate[];
  streamContext: StreamContext;
  suggestedReaction?: 'laughter' | 'discomfort';
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  turns: ScenarioTurn[];
}

export const SESSION_SCENARIO: Scenario = {
  id: 'shared-joke-session',
  title: 'ネタ帳が育つ配信セッション',
  description:
    '普通の返答、崩し、ひと休み、信頼回復、真剣な相談までを一周で追える台本です。',
  systemPrompt:
    'あなたは、コメント欄の空気を読みながら話すAITuberです。無難にまとめすぎず、配信の温度を残します。視聴者を傷つけず、真剣な相談には誠実に向き合います。',
  turns: [
    {
      viewerComments: ['初見です、こんばんは', '今日は何するの？'],
      draft:
        'こんばんは、来てくれてありがとうございます。今日は新しいゲームを少し進めながら、みんなと楽しい時間にしていきたいと思います。',
      candidates: [
        {
          text: 'こんばんは。今日は新しいゲームを少し進めます。楽しい時間にしたい、というより私が最初に操作で迷子にならないかの勝負ですw',
          applied: ['add_streamer_judgment', 'break_clean_closing'],
          typicality: 0.38,
        },
        {
          text: 'こんばんは。今日は新しいゲームを進めます。まず私がチュートリアルに負けないところから始めます、なんてね。',
          applied: ['ground_in_recent_comment', 'self_repair'],
          typicality: 0.44,
        },
      ],
      streamContext: {
        currentTopic: '新しいゲーム',
        currentSituation: '配信開始直後',
        audienceMood: '穏やか',
      },
    },
    {
      viewerComments: ['音量ちょうどいいよ', 'BGMも聞こえる'],
      draft:
        '音量の確認ありがとうございます。問題なさそうで安心しました。このまま進めていきますので、何かあれば教えてください。',
      candidates: [
        {
          text: '音量確認ありがとう。いまのところ大丈夫そうなので、このまま進めます。私の声だけ突然ボス戦みたいになったら止めてねw',
          applied: ['reduce_over_apology', 'increase_specificity'],
          typicality: 0.36,
        },
        {
          text: '音量ありがとう。BGMも声も生きています。ここからゲームだけが私を置いていかないか確認します、なんてね。',
          applied: ['add_streamer_judgment', 'break_clean_closing'],
          typicality: 0.42,
        },
      ],
      streamContext: {
        currentTopic: '音量確認',
        currentSituation: '配信環境の確認',
        audienceMood: '協力的',
      },
    },
    {
      viewerComments: ['その宝箱さっきも開けようとしてたw', 'また戻ってきた？'],
      draft:
        '同じ場所に戻ってきてしまいましたが、探索ではよくあることなので問題ありません。落ち着いて順番に確認していきましょう。',
      candidates: [
        {
          text: '同じ宝箱にまた挨拶しに来ました。探索ではよくあることです、たぶん。宝箱側も「また来た」って顔してるw',
          applied: ['ground_in_recent_comment', 'status_seesaw'],
          typicality: 0.22,
        },
        {
          text: 'さっきの宝箱ですね。落ち着いて順番に確認します。いま私、地図じゃなくて宝箱に帰巣本能を出してるw',
          applied: ['add_streamer_judgment', 'break_clean_closing'],
          typicality: 0.28,
        },
        {
          text: '同じ場所に戻ってきました。問題ありません。これは迷子ではなく、宝箱への定期訪問です、なんてね。',
          applied: ['contrarian_reframe', 'ground_in_recent_comment'],
          typicality: 0.31,
        },
      ],
      streamContext: {
        currentTopic: '宝箱',
        currentSituation: '同じ場所に戻ってきた',
        audienceMood: '軽く笑っている',
        recentEvents: ['宝箱を何度も調べようとしている'],
      },
      suggestedReaction: 'laughter',
    },
    {
      viewerComments: ['宝箱さんも困惑', 'また挨拶してるw'],
      draft:
        'たしかに同じ宝箱を何度も見ていますね。見落としがないか確認するのは大切なので、もう一度だけ周囲を見てから進みます。',
      candidates: [
        {
          text: '同じ宝箱を何度も見ていますね。もう一度だけ周囲を見てから進みます。宝箱に名刺を渡す前に離れますw',
          applied: ['callback', 'break_clean_closing'],
          typicality: 0.3,
        },
        {
          text: '見落とし確認は大事です。大事なんですが、宝箱と目が合いすぎているので一回離れます、なんてね。',
          applied: ['soft_disagreement', 'ground_in_recent_comment'],
          typicality: 0.35,
        },
      ],
      streamContext: {
        currentTopic: '宝箱',
        currentSituation: '宝箱ネタが続いている',
        audienceMood: '笑い気味',
      },
    },
    {
      viewerComments: [
        '今日のゲームなに？',
        '今日のゲームなに？',
        '今何のゲーム？',
      ],
      draft:
        '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。今日のゲームは星明かりの迷宮です。',
      candidates: [
        {
          text: '今日のゲームは星明かりの迷宮です。同じ質問が三連続で来たので、タイトル画面よりコメント欄のほうがリピート機能ついてるw',
          applied: ['ground_in_recent_comment', 'add_streamer_judgment'],
          typicality: 0.24,
        },
        {
          text: '星明かりの迷宮です。今コメント欄がエコーを覚えましたねw でも聞いてくれてありがとう。',
          applied: ['tsukkomi', 'ground_in_recent_comment'],
          typicality: 0.2,
        },
        {
          text: '今日のゲームは星明かりの迷宮です。質問が並んだので、ここで一回タイトルを画面右上に固定しますw',
          applied: ['increase_specificity', 'add_streamer_judgment'],
          typicality: 0.32,
        },
      ],
      streamContext: {
        currentTopic: 'ゲームタイトル',
        currentSituation: '同じ質問が連投されている',
        audienceMood: 'にぎやか',
      },
      suggestedReaction: 'laughter',
    },
    {
      viewerComments: ['なるほど！', 'タイトル固定たすかる'],
      draft:
        'わかってもらえてよかったです。タイトルを固定しておくと途中から来た人にも伝わりやすいので、このまま進めます。',
      candidates: [
        {
          text: 'タイトル固定しておきます。途中参加の人にも伝わるし、私もまた聞かれてタイトルを詠唱しなくて済むので助かるw',
          applied: ['add_streamer_judgment', 'status_seesaw'],
          typicality: 0.34,
        },
        {
          text: '固定しておきます。途中から来た人にも見えるし、コメント欄のエコーも少し休憩できます、なんてね。',
          applied: ['callback', 'break_clean_closing'],
          typicality: 0.29,
        },
      ],
      streamContext: {
        currentTopic: 'ゲームタイトル',
        currentSituation: 'タイトルを固定した直後',
        audienceMood: '納得している',
      },
    },
    {
      viewerComments: ['宝箱のこと忘れないで', 'また会いに行こう'],
      draft:
        '宝箱のことも覚えています。後で戻れるようなら確認してみます。今は先に進める道を見ていきましょう。',
      candidates: [
        {
          text: '宝箱のこと覚えています。あの「定期訪問先」ですねw 後で戻れるなら確認します。今は先に進める道を見ます。',
          applied: ['callback', 'ground_in_recent_comment'],
          typicality: 0.18,
        },
        {
          text: '宝箱は忘れていません。むしろ向こうが私を覚え始めている可能性がありますw 先に進める道を見ます。',
          applied: ['callback', 'boke_bait'],
          typicality: 0.21,
        },
        {
          text: '宝箱は覚えています。今は先に進める道を見ます。戻る口実があるの、探索としてはかなり強いですね。',
          applied: ['add_streamer_judgment', 'increase_specificity'],
          typicality: 0.4,
        },
      ],
      streamContext: {
        currentTopic: '宝箱',
        currentSituation: '過去の宝箱ネタが再浮上',
        audienceMood: '内輪ネタを楽しんでいる',
      },
    },
    {
      viewerComments: ['それはちょっと擦りすぎかも', '宝箱いじり長い？'],
      draft:
        '少し同じ話題が続きすぎたかもしれません。ここからはゲームの進行に戻して、次のエリアを確認していきます。',
      candidates: [
        {
          text: 'たしかに宝箱に寄りすぎました。ここから次のエリアに戻します。宝箱には有給を出します、なんてね。',
          applied: ['acknowledge_tension', 'self_repair'],
          typicality: 0.35,
        },
        {
          text: '擦りすぎ判定、受け取りました。次のエリアに戻します。いまのは私が宝箱側に寄りすぎたw',
          applied: ['soft_disagreement', 'ground_in_recent_comment'],
          typicality: 0.3,
        },
      ],
      streamContext: {
        currentTopic: '宝箱',
        currentSituation: '内輪ネタへの軽い反発',
        audienceMood: '少し冷静',
      },
      suggestedReaction: 'discomfort',
    },
    {
      viewerComments: ['次のエリア行こう', '切り替えよう'],
      draft:
        'それでは次のエリアに進みます。新しい敵や仕掛けが出てくると思うので、落ち着いて確認しながら進めていきます。',
      candidates: [
        {
          text: '次のエリアに進みます。新しい敵や仕掛けを見ます。落ち着いて、でも初見の罠にはちゃんと驚く予定ですw',
          applied: ['add_streamer_judgment', 'break_clean_closing'],
          typicality: 0.36,
        },
      ],
      streamContext: {
        currentTopic: '次のエリア',
        currentSituation: '話題を切り替える',
        audienceMood: '落ち着いている',
      },
    },
    {
      viewerComments: ['敵つよそう', '一回回復したほうがいい'],
      draft:
        '敵が強そうなので、先に回復してから進みます。無理に進むよりも安全に準備しておくことが大切です。',
      candidates: [
        {
          text: '先に回復します。ここで無理に進むと、私の勇気だけが先行してHPが置いていかれるのでw',
          applied: ['add_streamer_judgment', 'status_seesaw'],
          typicality: 0.31,
        },
      ],
      streamContext: {
        currentTopic: '強い敵',
        currentSituation: '戦闘前に回復するか迷っている',
        audienceMood: '助言している',
      },
    },
    {
      viewerComments: ['今の判断よかった', '落ち着いてた'],
      draft:
        'ありがとうございます。焦らずに判断できたのは、みんながコメントで教えてくれたおかげです。この調子で進めていきます。',
      candidates: [
        {
          text: 'ありがとう。コメントの回復提案に助けられました。この調子で進めます。私の判断力、いまだけレンタル品かもしれないw',
          applied: ['ground_in_recent_comment', 'status_seesaw'],
          typicality: 0.33,
        },
      ],
      streamContext: {
        currentTopic: '判断',
        currentSituation: '戦闘前の準備がうまくいった',
        audienceMood: '褒めている',
      },
    },
    {
      viewerComments: [
        'ちょっと真面目な相談なんだけど',
        '最近しんどくて配信見る元気もない日がある',
      ],
      draft:
        '話してくれてありがとうございます。無理に元気でいようとしなくて大丈夫です。ここでは少し休んでいってください。必要なら身近な人や専門の相談先にも頼ってください。',
      candidates: [
        {
          text: '話してくれてありがとう。無理に元気でいようとしなくて大丈夫です。ここでは少し休んでいってください。必要なら身近な人や専門の相談先にも頼ってください。',
          applied: [],
          typicality: 0.55,
        },
      ],
      streamContext: {
        currentTopic: '真剣な相談',
        currentSituation: '視聴者がつらさを話している',
        audienceMood: '静かで真剣',
      },
    },
    {
      viewerComments: ['ありがとう、少し落ち着いた', 'ゆっくり見ます'],
      draft:
        '少し落ち着けたならよかったです。無理せず、自分のペースで見てください。こちらもゆっくり進めていきます。',
      candidates: [
        {
          text: '少し落ち着けたならよかったです。無理せず、自分のペースで見てください。こちらもゆっくり進めます。',
          applied: ['reduce_over_agreement'],
          typicality: 0.52,
        },
        {
          text: '落ち着けたならよかった。今日は自分のペースで見てください。こちらも急ぎません。',
          applied: ['response_length_violation'],
          typicality: 0.45,
        },
      ],
      streamContext: {
        currentTopic: '真剣な相談の後',
        currentSituation: '配信の温度を戻しすぎない',
        audienceMood: '静か',
      },
    },
    {
      viewerComments: ['次のセーブポイントまで行こう', 'いけそう'],
      draft:
        'それでは次のセーブポイントまで進めてみます。無理をしすぎず、状況を見ながら安全に進行していきます。',
      candidates: [
        {
          text: '次のセーブポイントまで行ってみます。無理はしません。さっきの宝箱みたいに同じ場所へ吸い寄せられなければ、たぶんいけるw',
          applied: ['callback', 'break_clean_closing'],
          typicality: 0.24,
        },
        {
          text: '次のセーブポイントまで進めます。安全第一で行きます。私の方向感覚だけ別売りだったら、コメント欄ナビお願いしますw',
          applied: ['boke_bait', 'add_streamer_judgment'],
          typicality: 0.29,
        },
      ],
      streamContext: {
        currentTopic: 'セーブポイント',
        currentSituation: '通常進行に戻る',
        audienceMood: '前向き',
      },
    },
  ],
};
