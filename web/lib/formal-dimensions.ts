import { questions } from './question-bank';

// Labels, order and membership always come from the current official question bank.
export const formalDimensions = Array.from(new Set(questions.map(item => item.dimension_key))).map(key => {
  const items = questions.filter(item => item.dimension_key === key);
  return {
    key,
    name: items[0].dimension,
    subdimensions: Array.from(new Set(items.map(item => item.subdimension))).map(name => ({
      key: `${key}:${name}`,
      name,
      items: items.filter(item => item.subdimension === name),
    })),
  };
});
