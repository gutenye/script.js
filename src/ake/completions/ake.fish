function _setup_ake_complete
	set cmd $argv[1]
	set suffix $argv[2]
	complete --erase $cmd$suffix
	complete --command $cmd$suffix --no-files --arguments "(_ake_complete $suffix)"
end

function _ake_complete
	set suffix $argv[1]
	set unique_name (string replace --all '/' '_' $PWD)
	set name "ake$suffix.$unique_name"
	_carapace_completer $name
end

_setup_ake_complete ake
# _setup_ake_complete ake <suffix>

