# Demanded contact height: existing integration suites

Prepared at `/private/tmp/contact-height-demand-integration-20261004`, from exact `ef60d3cee120d6b157fe94386d923b6b4392205b` source plus the reviewed normal-selection and demanded-height overlays. No root runtime changes.

The relative-import closure contains 148 source files (1,769,576 bytes), including the three byte-identical existing test files. The worker URL entry is included as a literal dependency; the tests use fake/mocked worker delivery and device stepping. Eight narrow binary case links and the installed dependency link are input-only. There is no full repository, public tree, docs, copied `node_modules`, or unrelated test suite.

See [intent.md](intent.md) for the exact proposed check commands, expected 74 expanded tests, failure handling and coverage limits. [source-manifest.json](source-manifest.json) pins all closure files and both overlay stages against original sources. The five normal files were copied first; the three height files then replaced their corresponding normal files, while Runner and WorkerCore remain the reviewed normal selection exactly.

This is a reviewable, unexecuted integration preparation. Existing selected tests/assertions are unchanged. Syntax/typechecks, tests, replay, build, cost and hardware have **not run** in this directory. The preceding independent 38-test height verification and bounded complete-path CPU result do not count as an integration result here.

`prepare.py` is a source export, not a runtime/test wrapper. It refuses to overwrite existing output. The manifest's 148 baseline records are independently checkable against their exact Git blobs; final files are independently checkable against the reviewed prototype paths. All owned preparation records are frozen in `preparation-manifest.json` and `ready.json` after writing. No later normal/height source re-read or overlay is permitted during a check without new authority.
