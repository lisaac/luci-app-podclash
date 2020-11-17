local nixio     = require "nixio"
local util      = require "luci.util"
local table     = require "table"
local string    = require "string"
local coroutine = require "coroutine"

local assert    = assert
local tonumber  = tonumber
local tostring  = tostring
local error     = error
local type	    = type
local pairs	    = pairs
local ipairs    = ipairs
local next      = next
local pcall		= pcall

local band      = nixio.bit.band
local bor       = nixio.bit.bor
local rshift    = nixio.bit.rshift
local char      = string.char

local getmetatable = getmetatable
local syaml = {}

function syaml.encode(obj, ...)
	local out = {}
	local e = Encoder(obj, 1, ...):source()
	local chnk, err
	repeat
		chnk, err = e()
		out[#out+1] = chnk
	until not chnk
	return not err and table.concat(out) or nil
end


function null()
	return null
end

Encoder = util.class()

function Encoder.__init__(self, data, buffersize, fastescape)
	self.data = data
	self.buffersize = buffersize or 512
	self.buffer = ""
	self.fastescape = fastescape

	getmetatable(self).__call = Encoder.source
end

function Encoder.source(self)
	local source = coroutine.create(self.dispatch)
	return function()
		local res, data = coroutine.resume(source, self, self.data, true)
		if res then
			return data
		else
			return nil, data
		end
	end
end

function Encoder.dispatch(self, data, start)
	local parser = self.parsers[type(data)]

	parser(self, data)

	if start then
		if #self.buffer > 0 then
			coroutine.yield(self.buffer)
		end

		coroutine.yield()
	end
end

function Encoder.put(self, chunk)
	if self.buffersize < 2 then
		coroutine.yield(chunk)
	else
		if #self.buffer + #chunk > self.buffersize then
			local written = 0
			local fbuffer = self.buffersize - #self.buffer

			coroutine.yield(self.buffer .. chunk:sub(written + 1, fbuffer))
			written = fbuffer

			while #chunk - written > self.buffersize do
				fbuffer = written + self.buffersize
				coroutine.yield(chunk:sub(written + 1, fbuffer))
				written = fbuffer
			end

			self.buffer = chunk:sub(written + 1)
		else
			self.buffer = self.buffer .. chunk
		end
	end
end

function Encoder.parse_nil(self)
	self:put("null")
end

function Encoder.parse_bool(self, obj)
	self:put(obj and "true" or "false")
end

function Encoder.parse_number(self, obj)
	self:put(tostring(obj))
end

function Encoder.parse_raw(self, obj)
	if self.fastescape then
		self:put( obj:gsub('\\', '\\\\'):gsub('"', '\\"'))
	else
		self:put(
			obj:gsub('[%c\\"]',
				function(char)
					return '\\u00%02x' % char:byte()
				end
			))
	end
end

function Encoder.parse_string(self, obj)
	if self.fastescape then
		self:put('"' .. obj:gsub('\\', '\\\\'):gsub('"', '\\"') .. '"')
	else
		self:put('"' ..
			obj:gsub('[%c\\"]',
				function(char)
					return '\\u00%02x' % char:byte()
				end
			)
		.. '"')
	end
end

function Encoder.parse_iter(self, obj)
	if obj == null then
		return self:put("null")
	end

	if type(obj) == "table" and (#obj == 0 and next(obj)) then
		self:put("{ ")
		local first = true

		for key, entry in pairs(obj) do
			if key ~= null then
				first = first or self:put(", ")
				first = first and false
				self:parse_raw(tostring(key))
				self:put(": ")
				self:dispatch(entry)
			end
		end

		self:put(" }")
	else
		self:put("[ ")
		local first = true

		if type(obj) == "table" then
			for i=1, #obj do
				first = first or self:put(", ")
				first = first and nil
				self:dispatch(obj[i])
			end
		else
			for entry in obj do
				first = first or self:put(", ")
				first = first and nil
				self:dispatch(entry)
			end
		end

		self:put(" ]")
	end
end

function Encoder.parse_udata(self, obj)
	return self:parse_string(tostring(obj))
end

Encoder.parsers = {
	['nil']      = Encoder.parse_nil,
	['table']    = Encoder.parse_iter,
	['number']   = Encoder.parse_number,
	['string']   = Encoder.parse_string,
	['boolean']  = Encoder.parse_bool,
	['function'] = Encoder.parse_iter,
	['userdata'] = Encoder.parse_udata
}

return syaml