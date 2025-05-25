// Pluralizer inspired by ActiveSupport inflections

// Used for target lists, assuming all targets will be lower case

const irregularMap = {
  child: "children",
  man: "men",
  person: "people",
  quiz: "quizzes",
  ox: "oxen",
  mouse: "mice",
  louse: "lice",
  vertex: "vertices",
  matrix: "matrices",
  index: "indices",
  tomato: "tomatoes",
  potato: "potatoes"
};

const replacements = [
  [/quiz$/, "quizzes"],
  [/x$/, "xes"],
  [/ch$/, "ches"],
  [/ss$/, "sses"],
  [/sh$/, "shes"],
  [/s$/, "ses"]
];

function pluralize(word) {
  if (Object.values(irregularMap).includes(word)) {
    return word;
  }
  if (irregularMap[word]) {
    return irregularMap[word];
  }
  for (let ii = 0; ii < replacements.length; ii += 1) {
    const [pattern, replacement] = replacements[ii];
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }
  const m1 = word.match(/([^aeiouy]|qu)y$/i);
  if (m1) {
    return word.replace(/y$/, "ies");
  }
  const m2 = word.match(/(?:([^f])fe|([lr])f)$/i);
  if (m2) {
    return word.replace(/f$/, "ves");
  }
  return `${word}s`;
}

export { pluralize };
