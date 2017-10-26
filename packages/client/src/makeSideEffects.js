const filtr = require('filtr');

module.exports = array => async ctx => {
  const start = Date.now();
  const allPromises = array.map(async sideEffect => {
    const { when, execute } = sideEffect;

    if (!when || !execute) {
      return false;
    }

    const successfullyExecute = safely(() =>
      execute(ctx.event, ctx.projections, ctx.changes)
    );

    const satisfied = isMatch(when, ctx.event);

    if (satisfied) {
      return successfullyExecute();
    }

    return false;
  });

  const allDone = await Promise.all(allPromises);
  return {
    successfulEffects: allDone.filter(success => success).length,
    duration: Date.now() - start,
  };
};

const safely = fn => async () => {
  try {
    await fn();
    return true;
  } catch (e) {
    return false;
  }
};

const isMatch = (cond, obj) => {
  if (typeof cond === 'function') {
    return safelyTrue(() => cond(obj));
  }

  const query = filtr(cond);
  return query.test([obj]).length > 0;
};

const safelyTrue = fn => {
  try {
    return fn() === true;
  } catch (ex) {
    return false;
  }
};
