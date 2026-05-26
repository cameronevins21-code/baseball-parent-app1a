const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default {
  base: repositoryName ? `/${repositoryName}/` : '/'
};
