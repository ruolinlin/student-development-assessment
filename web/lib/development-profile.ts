import { questions, responseOptions } from './question-bank';
import type { AssessmentSession } from './assessment-session';
import type { DevelopmentProfile, DimensionResult, PreferenceResult, DevelopmentClue, EvidenceConnection } from './development-types';

// Descriptive evidence rules, not scoring rules or ability classifications.
// Verbatim term overlap is exposed as a question to check, never proof of ability.
const observableTerms = ['分析', '研究', '探索', '创造', '表达', '动手', '操作', '工具', '帮助', '合作', '组织', '计划', '坚持', '调整', '理解', '沟通', '学习', '设计', '解决', '挑战', '选择', '尝试'];
const excerpt = (text: string) => text.length > 90 ? `${text.slice(0, 90)}…` : text;
export function createDevelopmentProfile(session: AssessmentSession, dimensions: DimensionResult[], preferences: PreferenceResult[]): DevelopmentProfile {
  const normal = dimensions.filter(d => d.kind === 'scale');
  const subdimensions = normal.flatMap(d => d.subdimensions);
  const connections: EvidenceConnection[] = [];
  for (const [field, value] of Object.entries(session.personalInformation)) {
    if (!['strengthSubjects', 'achievementExperience', 'achievementReason'].includes(field) || !value.trim()) continue;
    const candidate = questions.map(item => ({ item, terms: observableTerms.filter(term => value.includes(term) && item.question_text.includes(term)) }))
      .filter(candidate => candidate.terms.length).sort((a, b) => b.terms.length - a.terms.length)[0];
    if (!candidate) continue;
    const response = responseOptions.find(option => option.value === session.answers[candidate.item.item_id])!.label;
    connections.push({ dimensionKey: candidate.item.dimension_key, dimensionName: candidate.item.dimension, itemId: candidate.item.item_id, questionText: candidate.item.question_text, responseLabel: response, contextField: field as EvidenceConnection['contextField'], studentText: value, sharedTerms: candidate.terms,
      explanation: `你填写的内容与“${candidate.item.subdimension}”的这道题都提到了“${candidate.terms.join('、')}”；你在该题选择“${response}”。这只是文字层面的联系，是否描述同一种真实行为，还需要结合当时的情境确认。` });
  }
  const clues: DevelopmentClue[] = [];
  const contrasted = normal.map(d => {
    const ordered = [...d.subdimensions].sort((a, b) => b.score - a.score);
    return { dimension: d, first: ordered[0], last: ordered[ordered.length - 1], spread: ordered[0].score - ordered[ordered.length - 1].score };
  }).sort((a, b) => b.spread - a.spread)[0];
  if (contrasted) {
    const { dimension, first, last, spread } = contrasted;
    clues.push({ id: 'within-dimension-pattern', title: `${dimension.name}中的回答分布`, dimensionKeys: [dimension.key], itemIds: [...first.itemIds, ...last.itemIds], description: spread > 0
      ? `在“${dimension.name}”中，“${first.name}”为 ${first.score.toFixed(2)}，“${last.name}”为 ${last.score.toFixed(2)}。这是同一次自我描述中的差异，值得比较两类情境中的投入和感受，不能据此判断哪种能力更好。`
      : `“${dimension.name}”的各子维度本次都为 ${first.score.toFixed(2)}。这些回答暂时没有区分出不同情境的差异，需要用具体经历继续观察。` });
  }
  const varied = subdimensions.map(sub => ({ sub, values: sub.itemIds.map(id => session.answers[id]) })).filter(item => item.values.length > 1)
    .map(item => ({ ...item, spread: Math.max(...item.values) - Math.min(...item.values) })).sort((a, b) => b.spread - a.spread)[0];
  if (varied) clues.push({ id: 'item-pattern', title: `${varied.sub.name}：回到具体情境`, dimensionKeys: [varied.sub.dimensionKey], itemIds: varied.sub.itemIds,
    description: varied.spread > 0 ? `“${varied.sub.name}”所含题目的原始选择为 ${varied.values.join('、')}。同一子维度中的回答并不完全相同，因此需要分开看每道题的情境，不能只用均值概括你。` : `“${varied.sub.name}”各题本次均选择 ${varied.values[0]}。回答一致是一条可复核的线索，但仍需真实经历来了解它是否在不同情境中出现。` });
  const preference = [...preferences].sort((a, b) => Math.abs(b.position - 3) - Math.abs(a.position - 3))[0];
  if (preference) clues.push({ id: 'preference-pattern', title: `${preference.name}：方式上的偏好`, dimensionKeys: [dimensions.find(d => d.kind === 'preference')!.key], itemIds: preference.itemIds, description: preference.explanation });
  if (connections[0]) clues.push({ id: 'experience-connection', title: '一处可以对照的真实经历线索', dimensionKeys: [connections[0].dimensionKey], itemIds: [connections[0].itemId], description: connections[0].explanation });

  const gaps = clues.slice(0, 4).map(clue => {
    const linked = connections.find(connection => clue.itemIds.includes(connection.itemId));
    const representative = questions.find(item => item.item_id === clue.itemIds[0])!;
    const experience = session.personalInformation.achievementExperience;
    return {
      id: `gap-${clue.id}`, dimensionKeys: clue.dimensionKeys, itemIds: clue.itemIds,
      description: linked ? `“${clue.title}”与个人信息有文字联系，但尚未核实你当时具体做了什么、是否主动选择以及是否愿意再次尝试。` : `目前填写的经历还不能直接核实“${clue.title}”。没有记录到对应经历，不表示你没有这方面的可能性。`,
      question: linked ? `你写到“${excerpt(linked.studentText)}”。其中与“${representative.subdimension}”有关的具体行为是什么？当时的感受与这次作答一致吗？`
        : experience ? `回到你写的“${excerpt(experience)}”：有没有与“${representative.subdimension}”有关的情境？如果没有，你想用什么小尝试了解这一点？`
        : `围绕“${representative.subdimension}”，你能想起一次类似“${excerpt(representative.question_text)}”的具体情境吗？当时你做了什么，又有什么不同的感受？`,
    };
  });
  return { clues, evidenceConnections: connections, evidenceGaps: gaps, explorationQuestions: gaps.map(gap => gap.question), interpretationVersion: 'descriptive-evidence-v1' };
}
