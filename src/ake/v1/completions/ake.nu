$env.config.completions.external.completer = {|spans: list<string>|
	# handle alias bug https://github.com/nushell/nushell/issues/8483
	mut alias = (scope aliases | where name == $spans.0 | get -i 0 | get -i expansion)
	if $spans.0 == 'ake' {
		let newName = (ake-find-dir)
		if ($newName | is-not-empty) {
			$alias = $newName
		}
	}
	let spans = (if $alias != null  {
		$spans | skip 1 | prepend ($alias | split row " " | take 1)
	} else {
		$spans
	})

	match $spans.0 {
		# __zoxide_z | __zoxide_zi => $zoxide_completer # use default cd completion
		_ => $carapace_completer 
		# _ => $fish_completer # slow
	} | do $in $spans
}
