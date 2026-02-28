complete --erase a
complete --command a --no-files --arguments '(_ake_complete)'

function _ake_complete
	set unique_name (string replace --all '/' '_' $PWD)
	set name "ake.$unique_name"
	_carapace_completer $name
end
