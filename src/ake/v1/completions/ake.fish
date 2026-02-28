complete --erase a
complete --command a --no-files --arguments '(_ake_complete)'

function _ake_complete
	set new_name "ake"
	set found "$(ake-find-dir)"
	if test -n "$found"
		set new_name "$found"
	end
	_carapace_completer $new_name
end
