# Height-demand worker integration

The frozen height-demand contact candidate passed strict TypeScript and all **74 tests in three unchanged existing suites**: Runner 43, Worker 23 and Host 8. Each command ran once, with no retry or source edit. The 178 pinned source, case, configuration and dependency inputs matched before and after both phases.

[Terminal](checks/terminal.json) and [verification proof](checks/verification-proof.json) preserve actual commands, process handles, timestamps, exit codes and artifact identities. [Original test output](checks/tests.log) and the [machine-readable result](checks/integration-tests.json.gz) report zero failures or pending tests. The functional run took about 69.83 seconds; that is verification latency, not a performance benchmark.

This export has 148 source files from `ef60d3cee120d6b157fe94386d923b6b4392205b`, with the five reviewed normal-demand overlays followed by the three final height-demand overlays. [Source manifest](source-manifest.json.gz) retains every Git-blob baseline/final identity and literal import edge. Runtime and prototype test sources are already preserved in the [height prototype checkpoint](../contact-height-demand-prototype/README.md) and [normal foundation checkpoint](../contact-normal-demand-prototype/README.md); unchanged existing suites are reconstructible from Git. Only eight barrel inputs and installed dependencies were linked for read-only use. No full repository or public tree was copied.

The [prepared intent](intent.md), [ready record](ready.json), [preparation manifest](preparation-manifest.json) and [prepared README](README.prepared.md) are exact historical source-only snapshots. Their NOT_RUN state describes preparation; the separate terminal record describes the later authorized execution.

The existing Worker suite uses Point without barrel cases, so these tests alone do not prove ordinary Padang's active private provider. The separate first-epoch F64 replay and source-reviewed persistent owner cover that boundary. Production build, live FPS, broader epoch equivalence and visual acceptance remain pending. This documentation introduces no runtime change.

[Manifest](manifest.json) pins every stored/expanded artifact and original alias. Gzip payloads use mtime 0; decompress them to recover byte-exact original JSON.
